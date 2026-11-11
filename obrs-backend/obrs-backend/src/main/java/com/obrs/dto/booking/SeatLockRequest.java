package com.obrs.dto.booking;

import jakarta.validation.constraints.*;

import java.util.List;

/** Step 1: temporarily lock seats for the current user. */
public record SeatLockRequest(
        @NotNull @Positive Long scheduleId,
        @NotEmpty @Size(max = 10) List<@NotBlank @Pattern(regexp = "^[A-Z]?\\d{1,3}$", message = "invalid seat number") String> seatNumbers) { }
