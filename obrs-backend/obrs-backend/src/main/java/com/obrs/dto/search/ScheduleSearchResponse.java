package com.obrs.dto.search;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** One bus card in search results. */
public record ScheduleSearchResponse(
        Long scheduleId,
        String operatorName,
        BigDecimal operatorRating,
        String busName,
        String busType,
        boolean airConditioned,
        boolean sleeper,
        String sourceCity,
        String destinationCity,
        LocalDateTime departureTime,
        LocalDateTime arrivalTime,
        long durationMinutes,
        BigDecimal baseFare,
        int totalSeats,
        int availableSeats) { }
