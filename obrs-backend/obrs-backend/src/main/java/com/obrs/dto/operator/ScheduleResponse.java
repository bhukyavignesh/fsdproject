package com.obrs.dto.operator;

import com.obrs.model.Schedule;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ScheduleResponse(Long id, Long busId, String busName, Long routeId, String sourceCity, String destinationCity,
                               LocalDateTime departureTime, LocalDateTime arrivalTime, BigDecimal baseFare, String status) {
    public static ScheduleResponse from(Schedule s) {
        return new ScheduleResponse(s.getId(), s.getBus().getId(), s.getBus().getBusName(), s.getRoute().getId(),
                s.getRoute().getSourceCity(), s.getRoute().getDestinationCity(),
                s.getDepartureTime(), s.getArrivalTime(), s.getBaseFare(), s.getStatus().name());
    }
}
