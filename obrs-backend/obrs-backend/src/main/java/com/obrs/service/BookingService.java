package com.obrs.service;

import com.obrs.config.AppProperties;
import com.obrs.dto.booking.*;
import com.obrs.exception.ApiException;
import com.obrs.exception.ErrorCode;
import com.obrs.model.*;
import com.obrs.repository.BookingRepository;
import com.obrs.repository.BookedSeatRepository;
import com.obrs.repository.ScheduleRepository;
import com.obrs.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Seat locking, booking confirmation, cancellation and lock expiry.
 *
 * <h2>How double booking is prevented</h2>
 * <ol>
 *   <li><b>Pessimistic row lock.</b> Every operation that claims or frees seats first runs
 *       {@code SELECT ... FOR UPDATE} on the schedule row ({@link ScheduleRepository#findByIdForUpdate}).
 *       Concurrent requests for the same bus queue up, so "check seats are free, then insert"
 *       cannot interleave. Different schedules never block each other.</li>
 *   <li><b>Unique index.</b> {@code UNIQUE(schedule_id, seat_number, active_flag)} on booked_seats
 *       guarantees at the database level that a seat has at most one live claim, even if
 *       some code path skipped step 1.</li>
 *   <li><b>Short transactions.</b> Payment is charged <i>outside</i> any transaction so a slow
 *       gateway never holds the row lock; the result is applied in a second short transaction,
 *       with an automatic refund if the lock expired in between.</li>
 * </ol>
 */
@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);
    private static final int MAX_PENDING_PER_USER = 3;

    private final BookingRepository bookingRepository;
    private final BookedSeatRepository bookedSeatRepository;
    private final ScheduleRepository scheduleRepository;
    private final UserRepository userRepository;
    private final SeatLayoutService seatLayoutService;
    private final FareCalculator fareCalculator;
    private final PnrGenerator pnrGenerator;
    private final PaymentGateway paymentGateway;
    private final TransactionTemplate tx;
    private final Clock clock;
    private final ZoneId zone;
    private final Duration lockDuration;
    private final int maxSeats;

    public BookingService(BookingRepository bookingRepository, BookedSeatRepository bookedSeatRepository,
                          ScheduleRepository scheduleRepository, UserRepository userRepository,
                          SeatLayoutService seatLayoutService, FareCalculator fareCalculator,
                          PnrGenerator pnrGenerator, PaymentGateway paymentGateway,
                          PlatformTransactionManager transactionManager, Clock clock, AppProperties props) {
        this.bookingRepository = bookingRepository;
        this.bookedSeatRepository = bookedSeatRepository;
        this.scheduleRepository = scheduleRepository;
        this.userRepository = userRepository;
        this.seatLayoutService = seatLayoutService;
        this.fareCalculator = fareCalculator;
        this.pnrGenerator = pnrGenerator;
        this.paymentGateway = paymentGateway;
        this.tx = new TransactionTemplate(transactionManager);
        this.clock = clock;
        this.zone = ZoneId.of(props.booking().zoneId());
        this.lockDuration = props.booking().seatLockDuration();
        this.maxSeats = props.booking().maxSeatsPerBooking();
    }

    // ------------------------------------------------------------------ lock

    /** Step 1: temporarily lock seats. Creates a PENDING booking that expires after the lock duration. */
    @Transactional
    public SeatLockResponse lockSeats(Long userId, SeatLockRequest req) {
        Instant now = clock.instant();
        List<String> requested = req.seatNumbers().stream().map(String::trim).distinct().sorted().toList();
        if (requested.size() > maxSeats) {
            throw new ApiException(ErrorCode.SEAT_LIMIT_EXCEEDED, "You can book at most " + maxSeats + " seats at a time");
        }

        // 1) Serialise all seat operations on this schedule.
        Schedule schedule = lockSchedule(req.scheduleId());
        ensureBookable(schedule);

        // 2) Validate seat numbers against the bus layout.
        Set<String> validSeats = seatLayoutService.seatNumbersOf(schedule.getBus());
        List<String> unknown = requested.stream().filter(s -> !validSeats.contains(s)).toList();
        if (!unknown.isEmpty()) {
            throw new ApiException(ErrorCode.INVALID_SEAT, "Unknown seat(s): " + String.join(", ", unknown), Map.of("seats", unknown));
        }

        // 3) A user may hold only one pending lock per schedule: replace the previous one.
        bookingRepository.findByUserIdAndScheduleIdAndBookingStatus(userId, schedule.getId(), BookingStatus.PENDING)
                .forEach(old -> old.releaseSeats(BookingStatus.CANCELLED, now));
        bookingRepository.flush();

        // Anti-hoarding: cap concurrent holds across different buses.
        if (bookingRepository.countByUserIdAndBookingStatus(userId, BookingStatus.PENDING) >= MAX_PENDING_PER_USER) {
            throw new ApiException(ErrorCode.SEAT_LIMIT_EXCEEDED, "You already have " + MAX_PENDING_PER_USER + " seat holds in progress. Complete or release one first.");
        }

        // 4) Free seats whose lock has lapsed on this schedule (we hold the schedule lock, so this is safe).
        releaseExpiredLocksLocked(schedule.getId(), now);

        // 5) Check availability.
        List<String> taken = bookedSeatRepository.findActiveSeatNumbers(schedule.getId(), requested);
        if (!taken.isEmpty()) {
            throw new ApiException(ErrorCode.SEATS_UNAVAILABLE,
                    "Seat(s) " + String.join(", ", taken) + " are no longer available", Map.of("unavailableSeats", taken));
        }

        // 6) Claim. saveAndFlush makes the unique index fire *now* (inside this method) if anything slipped through.
        User user = userRepository.getReferenceById(userId);
        Instant expiresAt = now.plus(lockDuration);
        Booking booking = new Booking(user, schedule, expiresAt);
        requested.forEach(seat -> booking.addSeat(new BookedSeat(schedule, seat, schedule.getBaseFare())));
        FareCalculator.Fare fare = fareCalculator.calculate(booking.getSeats().stream().map(BookedSeat::getFare).toList());
        booking.setAmounts(fare.base(), fare.tax(), fare.total());
        bookingRepository.saveAndFlush(booking);

        log.info("User {} locked seats {} on schedule {} (booking {})", userId, requested, schedule.getId(), booking.getId());
        return new SeatLockResponse(booking.getId(), schedule.getId(), requested, fare.total(), expiresAt, lockDuration.toSeconds());
    }

    /** Lets the user give seats back before the timer runs out. */
    @Transactional
    public void releaseLock(Long userId, Long bookingId) {
        Booking booking = ownedLocked(bookingId, userId);
        if (booking.getBookingStatus() != BookingStatus.PENDING) {
            throw new ApiException(ErrorCode.BOOKING_NOT_PENDING, "Only pending seat locks can be released");
        }
        booking.releaseSeats(BookingStatus.CANCELLED, clock.instant());
    }

    // --------------------------------------------------------------- confirm

    private enum Outcome { READY, ALREADY_CONFIRMED, EXPIRED }
    private record Prepared(Outcome outcome, BigDecimal total) { }

    /**
     * Step 2: attach passengers, take payment and confirm. Three phases:
     * (1) short tx: validate + price; (2) charge without holding locks; (3) short tx: finalise.
     */
    public BookingResponse confirmBooking(Long userId, Long bookingId, ConfirmBookingRequest req) {
        // Phase 1
        Prepared prepared = tx.execute(status -> {
            Instant now = clock.instant();
            Booking booking = ownedLocked(bookingId, userId);
            if (booking.getBookingStatus() == BookingStatus.CONFIRMED) {
                return new Prepared(Outcome.ALREADY_CONFIRMED, booking.getTotalAmount());
            }
            if (booking.getBookingStatus() != BookingStatus.PENDING) {
                throw new ApiException(ErrorCode.BOOKING_NOT_PENDING, "This booking can no longer be confirmed");
            }
            if (booking.isLockExpired(now)) {
                booking.releaseSeats(BookingStatus.EXPIRED, now); // committed, then we report the error
                return new Prepared(Outcome.EXPIRED, null);
            }
            applyPassengers(booking, req.passengers());
            booking.setContact(req.contactEmail().trim().toLowerCase(Locale.ROOT), req.contactPhone());
            FareCalculator.Fare fare = fareCalculator.calculate(booking.getSeats().stream().map(BookedSeat::getFare).toList());
            booking.setAmounts(fare.base(), fare.tax(), fare.total());
            return new Prepared(Outcome.READY, fare.total());
        });

        if (prepared.outcome() == Outcome.ALREADY_CONFIRMED) {
            return getBooking(userId, bookingId); // idempotent double-submit
        }
        if (prepared.outcome() == Outcome.EXPIRED) {
            throw lockExpired();
        }

        // Phase 2: outside any transaction.
        PaymentGateway.PaymentResult payment = paymentGateway.charge("booking-" + bookingId, prepared.total(), req.paymentToken());
        if (!payment.success()) {
            throw new ApiException(ErrorCode.PAYMENT_FAILED, "Payment failed: " + payment.failureReason() + ". Your seats stay locked until the timer ends.");
        }

        // Phase 3
        try {
            BookingResponse confirmed = tx.execute(status -> {
                Instant now = clock.instant();
                Booking booking = ownedLocked(bookingId, userId);
                if (booking.getBookingStatus() != BookingStatus.PENDING || booking.isLockExpired(now)) {
                    return null; // lock lapsed (or a parallel request won) while paying
                }
                booking.confirm(pnrGenerator.next(), payment.reference(), now);
                bookingRepository.flush();
                return BookingResponse.from(booking);
            });
            if (confirmed == null) {
                paymentGateway.refund(payment.reference(), prepared.total());
                expireIfPending(userId, bookingId);
                throw lockExpired();
            }
            log.info("Booking {} confirmed with PNR {}", bookingId, confirmed.pnrNumber());
            return confirmed;
        } catch (ApiException e) {
            throw e;
        } catch (RuntimeException e) {
            log.error("Confirmation failed after payment {}; refunding", payment.reference(), e);
            paymentGateway.refund(payment.reference(), prepared.total());
            throw e;
        }
    }

    // ---------------------------------------------------------------- cancel

    /**
     * Passenger cancellation with a time-based refund policy:
     * more than 24 h before departure: 75%; 6-24 h: 50%; under 6 h: not allowed.
     */
    @Transactional
    public BookingResponse cancelBooking(Long userId, String pnr) {
        String normalisedPnr = pnr.toUpperCase(Locale.ROOT);
        Long scheduleId = bookingRepository.findScheduleIdByPnrAndUserId(normalisedPnr, userId)
                .orElseThrow(() -> ApiException.notFound("Booking"));
        Schedule schedule = lockSchedule(scheduleId); // lock first, then read current booking state
        Booking booking = bookingRepository.findByPnrNumberAndUserId(normalisedPnr, userId)
                .orElseThrow(() -> ApiException.notFound("Booking"));
        if (booking.getBookingStatus() != BookingStatus.CONFIRMED) {
            throw new ApiException(ErrorCode.CANCELLATION_NOT_ALLOWED, "Only confirmed bookings can be cancelled");
        }
        long hoursLeft = Duration.between(LocalDateTime.now(clock.withZone(zone)), schedule.getDepartureTime()).toHours();
        if (hoursLeft < 6) {
            throw new ApiException(ErrorCode.CANCELLATION_NOT_ALLOWED, "Bookings cannot be cancelled within 6 hours of departure");
        }
        BigDecimal ratio = hoursLeft >= 24 ? new BigDecimal("0.75") : new BigDecimal("0.50");
        BigDecimal refund = booking.getTotalAmount().multiply(ratio).setScale(2, RoundingMode.HALF_DOWN);

        booking.releaseSeats(BookingStatus.CANCELLED, clock.instant());
        booking.setRefundAmount(refund);
        paymentGateway.refund(booking.getPaymentReference(), refund);
        log.info("Booking {} cancelled, refund {}", booking.getPnrNumber(), refund);
        return BookingResponse.from(booking);
    }

    // ----------------------------------------------------------------- reads

    @Transactional(readOnly = true)
    public BookingResponse getBooking(Long userId, Long bookingId) {
        return BookingResponse.from(owned(bookingId, userId));
    }

    @Transactional(readOnly = true)
    public BookingResponse getByPnr(Long userId, String pnr) {
        return bookingRepository.findByPnrNumberAndUserId(pnr.toUpperCase(Locale.ROOT), userId)
                .map(BookingResponse::from)
                .orElseThrow(() -> ApiException.notFound("Booking"));
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> myBookings(Long userId, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 50);
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(Math.max(page, 0), safeSize))
                .stream().map(BookingResponse::from).toList();
    }

    // --------------------------------------------------------------- expiry

    /**
     * Releases expired locks on one schedule in its own transaction (called by the cleanup job).
     * @return number of bookings expired
     */
    @Transactional
    public int releaseExpiredLocks(Long scheduleId) {
        lockSchedule(scheduleId);
        return releaseExpiredLocksLocked(scheduleId, clock.instant());
    }

    /** Caller must already hold the schedule lock. */
    private int releaseExpiredLocksLocked(Long scheduleId, Instant now) {
        List<Booking> expired = bookingRepository.findExpiredLocks(scheduleId, BookingStatus.PENDING, now);
        expired.forEach(b -> b.releaseSeats(BookingStatus.EXPIRED, now));
        if (!expired.isEmpty()) {
            bookingRepository.flush(); // NULL the active flags before any new claims are inserted
            log.debug("Released {} expired lock(s) on schedule {}", expired.size(), scheduleId);
        }
        return expired.size();
    }

    // --------------------------------------------------------------- helpers

    private Schedule lockSchedule(Long scheduleId) {
        return scheduleRepository.findByIdForUpdate(scheduleId).orElseThrow(() -> ApiException.notFound("Schedule"));
    }

    /**
     * Locks the booking's schedule row FIRST and only then loads the booking, so the
     * status we act on cannot be changed underneath us (e.g. by the expiry job).
     */
    private Booking ownedLocked(Long bookingId, Long userId) {
        Long scheduleId = bookingRepository.findScheduleIdByIdAndUserId(bookingId, userId)
                .orElseThrow(() -> ApiException.notFound("Booking"));
        lockSchedule(scheduleId);
        return owned(bookingId, userId);
    }

    /** Owner-scoped lookup: another user's booking id yields 404, not 403, so ids cannot be probed. */
    private Booking owned(Long bookingId, Long userId) {
        return bookingRepository.findByIdAndUserId(bookingId, userId).orElseThrow(() -> ApiException.notFound("Booking"));
    }

    private void ensureBookable(Schedule schedule) {
        boolean departed = !schedule.getDepartureTime().isAfter(LocalDateTime.now(clock.withZone(zone)));
        if (schedule.getStatus() != ScheduleStatus.SCHEDULED || departed || !schedule.getBus().isActive()) {
            throw new ApiException(ErrorCode.SCHEDULE_NOT_BOOKABLE, "This bus is no longer open for booking");
        }
    }

    private void applyPassengers(Booking booking, List<PassengerRequest> passengers) {
        Map<String, BookedSeat> seats = booking.getSeats().stream()
                .collect(Collectors.toMap(BookedSeat::getSeatNumber, Function.identity()));
        Set<String> provided = passengers.stream().map(PassengerRequest::seatNumber).collect(Collectors.toSet());
        if (passengers.size() != seats.size() || !provided.equals(seats.keySet())) {
            throw new ApiException(ErrorCode.PASSENGER_SEAT_MISMATCH,
                    "Provide exactly one passenger for each locked seat: " + String.join(", ", new TreeSet<>(seats.keySet())));
        }
        passengers.forEach(p -> seats.get(p.seatNumber()).assignPassenger(p.name().trim(), p.age(), p.gender()));
    }

    private void expireIfPending(Long userId, Long bookingId) {
        tx.executeWithoutResult(status -> {
            Booking b = ownedLocked(bookingId, userId);
            if (b.getBookingStatus() == BookingStatus.PENDING) {
                b.releaseSeats(BookingStatus.EXPIRED, clock.instant());
            }
        });
    }

    private ApiException lockExpired() {
        return new ApiException(ErrorCode.LOCK_EXPIRED, "Your seat lock expired. Any payment taken has been refunded. Please select seats again.");
    }
}
