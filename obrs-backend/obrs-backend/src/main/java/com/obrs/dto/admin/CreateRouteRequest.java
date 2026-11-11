package com.obrs.dto.admin;

import jakarta.validation.constraints.*;

public record CreateRouteRequest(
        @NotBlank @Size(max = 80) @Pattern(regexp = "^[\\p{L} .-]+$") String sourceCity,
        @NotBlank @Size(max = 80) @Pattern(regexp = "^[\\p{L} .-]+$") String destinationCity,
        @Min(1) @Max(5000) int distanceKm,
        @Min(10) @Max(4320) int estimatedDurationMinutes) { }
