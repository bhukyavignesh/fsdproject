package com.obrs.dto.booking;

import com.obrs.model.BookedSeat;
import com.obrs.model.Booking;
import com.obrs.model.Schedule;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

public record BookingResponse(
        Long bookingId,
        String pnrNumber,
        String bookingStatus,
        Long scheduleId,
        String operatorName,
        String busName,
        String busType,
        String sourceCity,
        String destinationCity,
        LocalDateTime departureTime,
        LocalDateTime arrivalTime,
        List<SeatInfo> seats,
        BigDecimal baseAmount,
        BigDecimal taxAmount,
        BigDecimal totalAmount,
        BigDecimal refundAmount,
        String contactEmail,
        String contactPhone,
        Instant lockExpiresAt,
        Instant createdAt,
        Instant confirmedAt,
        Instant cancelledAt) {

    public record SeatInfo(String seatNumber, String seatStatus, BigDecimal fare, String passengerName, Integer passengerAge, String passengerGender) {
        static SeatInfo from(BookedSeat s) {
            return new SeatInfo(s.getSeatNumber(), s.getSeatStatus().name(), s.getFare(), s.getPassengerName(), s.getPassengerAge(),
                    s.getPassengerGender() == null ? null : s.getPassengerGender().name());
        }
    }

    /** Must be called inside a transaction (touches lazy associations). */
    public static BookingResponse from(Booking b) {
        Schedule s = b.getSchedule();
        return new BookingResponse(
                b.getId(), b.getPnrNumber(), b.getBookingStatus().name(), s.getId(),
                s.getBus().getOperator().getName(), s.getBus().getBusName(), s.getBus().getBusType().name(),
                s.getRoute().getSourceCity(), s.getRoute().getDestinationCity(), s.getDepartureTime(), s.getArrivalTime(),
                b.getSeats().stream().map(SeatInfo::from).toList(),
                b.getBaseAmount(), b.getTaxAmount(), b.getTotalAmount(), b.getRefundAmount(),
                b.getContactEmail(), b.getContactPhone(), b.getLockExpiresAt(),
                b.getCreatedAt(), b.getConfirmedAt(), b.getCancelledAt());
    }
}
