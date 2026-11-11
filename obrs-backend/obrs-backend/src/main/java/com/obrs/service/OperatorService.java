package com.obrs.service;

import com.obrs.config.AppProperties;
import com.obrs.dto.operator.*;
import com.obrs.exception.ApiException;
import com.obrs.exception.ErrorCode;
import com.obrs.model.*;
import com.obrs.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Operator self-service. Every method takes the caller's operatorId (from the
 * authenticated principal) and scopes all reads/writes to it, so one operator
 * can never see or change another operator's buses, trips or passengers.
 */
@Service
public class OperatorService {

    private static final Duration MAX_TRIP_LENGTH = Duration.ofDays(3);

    private final BusRepository busRepository;
    private final RouteRepository routeRepository;
    private final ScheduleRepository scheduleRepository;
    private final BookingRepository bookingRepository;
    private final OperatorRepository operatorRepository;
    private final SeatLayoutService seatLayoutService;
    private final PaymentGateway paymentGateway;
    private final Clock clock;
    private final ZoneId zone;

    public OperatorService(BusRepository busRepository, RouteRepository routeRepository, ScheduleRepository scheduleRepository,
                           BookingRepository bookingRepository, OperatorRepository operatorRepository,
                           SeatLayoutService seatLayoutService, PaymentGateway paymentGateway, Clock clock, AppProperties props) {
        this.busRepository = busRepository;
        this.routeRepository = routeRepository;
        this.scheduleRepository = scheduleRepository;
        this.bookingRepository = bookingRepository;
        this.operatorRepository = operatorRepository;
        this.seatLayoutService = seatLayoutService;
        this.paymentGateway = paymentGateway;
        this.clock = clock;
        this.zone = ZoneId.of(props.booking().zoneId());
    }

    @Transactional
    public BusResponse createBus(Long operatorId, CreateBusRequest req) {
        Operator operator = operatorRepository.findById(requireOperator(operatorId)).orElseThrow(() -> ApiException.notFound("Operator"));
        String reg = req.registrationNumber().toUpperCase(Locale.ROOT);
        if (busRepository.existsByRegistrationNumberIgnoreCase(reg)) {
            throw new ApiException(ErrorCode.DUPLICATE_RESOURCE, "A bus with this registration number already exists");
        }
        SeatLayoutService.LayoutConfig layout = (req.layoutConfig() == null || req.layoutConfig().isBlank())
                ? seatLayoutService.defaultLayout(req.busType())
                : seatLayoutService.parseAndValidate(req.layoutConfig());
        int totalSeats = seatLayoutService.seatsOf(layout).size();
        Bus bus = new Bus(operator, req.busName().trim(), reg, req.busType(), totalSeats, seatLayoutService.toJson(layout));
        return BusResponse.from(busRepository.save(bus));
    }

    @Transactional(readOnly = true)
    public List<BusResponse> listBuses(Long operatorId) {
        return busRepository.findByOperatorIdOrderByBusName(requireOperator(operatorId)).stream().map(BusResponse::from).toList();
    }

    @Transactional
    public ScheduleResponse createSchedule(Long operatorId, CreateScheduleRequest req) {
        Bus bus = busRepository.findByIdAndOperatorId(req.busId(), requireOperator(operatorId))
                .filter(Bus::isActive)
                .orElseThrow(() -> ApiException.notFound("Bus"));
        Route route = routeRepository.findById(req.routeId()).orElseThrow(() -> ApiException.notFound("Route"));

        if (!req.arrivalTime().isAfter(req.departureTime())) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Arrival must be after departure");
        }
        if (Duration.between(req.departureTime(), req.arrivalTime()).compareTo(MAX_TRIP_LENGTH) > 0) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Trip cannot be longer than 3 days");
        }
        if (!req.departureTime().isAfter(LocalDateTime.now(clock.withZone(zone)))) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Departure must be in the future");
        }
        if (scheduleRepository.existsOverlapping(bus.getId(), req.departureTime(), req.arrivalTime(), ScheduleStatus.SCHEDULED)) {
            throw new ApiException(ErrorCode.SCHEDULE_CONFLICT, "This bus already has a trip in that time window");
        }
        Schedule schedule = new Schedule(bus, route, req.departureTime(), req.arrivalTime(), req.baseFare());
        return ScheduleResponse.from(scheduleRepository.save(schedule));
    }

    @Transactional(readOnly = true)
    public List<ScheduleResponse> listSchedules(Long operatorId, LocalDate from, LocalDate to) {
        if (to.isBefore(from) || Duration.between(from.atStartOfDay(), to.atStartOfDay()).toDays() > 62) {
            throw new ApiException(ErrorCode.BAD_REQUEST, "Date range must be valid and at most 62 days");
        }
        return scheduleRepository.findForOperator(requireOperator(operatorId), from.atStartOfDay(), to.plusDays(1).atStartOfDay())
                .stream().map(ScheduleResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<ManifestEntry> manifest(Long operatorId, Long scheduleId) {
        ownedSchedule(operatorId, scheduleId);
        List<ManifestEntry> out = new ArrayList<>();
        bookingRepository.findByScheduleIdAndBookingStatusOrderByConfirmedAtAsc(scheduleId, BookingStatus.CONFIRMED)
                .forEach(b -> b.getSeats().forEach(s -> out.add(new ManifestEntry(b.getPnrNumber(), s.getSeatNumber(),
                        s.getPassengerName(), s.getPassengerAge(),
                        s.getPassengerGender() == null ? null : s.getPassengerGender().name(), b.getContactPhone()))));
        return out;
    }

    /** Operator cancels a trip: every confirmed passenger gets a full refund. */
    @Transactional
    public ScheduleResponse cancelSchedule(Long operatorId, Long scheduleId) {
        ownedSchedule(operatorId, scheduleId);
        Schedule schedule = scheduleRepository.findByIdForUpdate(scheduleId).orElseThrow(() -> ApiException.notFound("Schedule"));
        if (schedule.getStatus() != ScheduleStatus.SCHEDULED) {
            throw new ApiException(ErrorCode.SCHEDULE_NOT_BOOKABLE, "Only scheduled trips can be cancelled");
        }
        Instant now = clock.instant();
        schedule.setStatus(ScheduleStatus.CANCELLED);
        for (BookingStatus status : List.of(BookingStatus.CONFIRMED, BookingStatus.PENDING)) {
            bookingRepository.findByScheduleIdAndBookingStatusOrderByConfirmedAtAsc(scheduleId, status).forEach(b -> {
                if (status == BookingStatus.CONFIRMED) {
                    b.setRefundAmount(b.getTotalAmount());
                    paymentGateway.refund(b.getPaymentReference(), b.getTotalAmount());
                }
                b.releaseSeats(BookingStatus.CANCELLED, now);
            });
        }
        return ScheduleResponse.from(schedule);
    }

    private Schedule ownedSchedule(Long operatorId, Long scheduleId) {
        Long op = requireOperator(operatorId);
        return scheduleRepository.findDetailedById(scheduleId)
                .filter(s -> s.getBus().getOperator().getId().equals(op))
                .orElseThrow(() -> ApiException.notFound("Schedule"));
    }

    private Long requireOperator(Long operatorId) {
        if (operatorId == null) {
            throw new ApiException(ErrorCode.FORBIDDEN, "This account is not linked to an operator");
        }
        return operatorId;
    }
}
