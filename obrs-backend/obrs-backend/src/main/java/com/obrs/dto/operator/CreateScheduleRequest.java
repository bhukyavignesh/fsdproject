package com.obrs.dto.operator;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CreateScheduleRequest(
        @NotNull @Positive Long busId,
        @NotNull @Positive Long routeId,
        @NotNull @Future LocalDateTime departureTime,
        @NotNull @Future LocalDateTime arrivalTime,
        @NotNull @DecimalMin("1.00") @DecimalMax("100000.00") @Digits(integer = 8, fraction = 2) BigDecimal baseFare) { }
