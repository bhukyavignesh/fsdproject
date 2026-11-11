package com.obrs.controller;

import com.obrs.dto.booking.BookingResponse;
import com.obrs.dto.booking.ConfirmBookingRequest;
import com.obrs.dto.booking.SeatLockRequest;
import com.obrs.dto.booking.SeatLockResponse;
import com.obrs.security.CustomUserDetails;
import com.obrs.service.BookingService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Booking flow (all endpoints require a logged-in user; every lookup is scoped to that user).
 * <pre>
 * POST   /api/bookings/lock                     lock seats (10-min hold)     -> 201 SeatLockResponse
 * DELETE /api/bookings/{bookingId}/lock         release the hold early       -> 204
 * POST   /api/bookings/{bookingId}/confirm      passengers + payment -> PNR  -> BookingResponse
 * GET    /api/bookings/{bookingId}              booking details
 * GET    /api/bookings/pnr/{pnr}                lookup by PNR
 * GET    /api/bookings/my?page=0&size=20        booking history
 * POST   /api/bookings/pnr/{pnr}/cancel         cancel with refund policy
 * </pre>
 */
@RestController
@RequestMapping("/api/bookings")
@PreAuthorize("isAuthenticated()")
@Validated
public class BookingController {

    private static final String PNR = "^[A-Za-z0-9]{10}$";
    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping("/lock")
    public ResponseEntity<SeatLockResponse> lockSeats(@AuthenticationPrincipal CustomUserDetails user,
                                                      @Valid @RequestBody SeatLockRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookingService.lockSeats(user.getId(), request));
    }

    @DeleteMapping("/{bookingId}/lock")
    public ResponseEntity<Void> releaseLock(@AuthenticationPrincipal CustomUserDetails user, @PathVariable @Positive Long bookingId) {
        bookingService.releaseLock(user.getId(), bookingId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{bookingId}/confirm")
    public BookingResponse confirm(@AuthenticationPrincipal CustomUserDetails user, @PathVariable @Positive Long bookingId,
                                   @Valid @RequestBody ConfirmBookingRequest request) {
        return bookingService.confirmBooking(user.getId(), bookingId, request);
    }

    @GetMapping("/{bookingId}")
    public BookingResponse get(@AuthenticationPrincipal CustomUserDetails user, @PathVariable @Positive Long bookingId) {
        return bookingService.getBooking(user.getId(), bookingId);
    }

    @GetMapping("/pnr/{pnr}")
    public BookingResponse byPnr(@AuthenticationPrincipal CustomUserDetails user, @PathVariable @Pattern(regexp = PNR) String pnr) {
        return bookingService.getByPnr(user.getId(), pnr);
    }

    @GetMapping("/my")
    public List<BookingResponse> myBookings(@AuthenticationPrincipal CustomUserDetails user,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "20") int size) {
        return bookingService.myBookings(user.getId(), page, size);
    }

    @PostMapping("/pnr/{pnr}/cancel")
    public BookingResponse cancel(@AuthenticationPrincipal CustomUserDetails user, @PathVariable @Pattern(regexp = PNR) String pnr) {
        return bookingService.cancelBooking(user.getId(), pnr);
    }
}
