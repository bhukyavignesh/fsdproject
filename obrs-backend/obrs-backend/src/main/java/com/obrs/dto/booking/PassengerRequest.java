package com.obrs.dto.booking;

import com.obrs.model.Gender;
import jakarta.validation.constraints.*;

public record PassengerRequest(
        @NotBlank @Pattern(regexp = "^[A-Z]?\\d{1,3}$") String seatNumber,
        @NotBlank @Size(min = 2, max = 100) @Pattern(regexp = "^[\\p{L} .'-]+$", message = "contains invalid characters") String name,
        @NotNull @Min(1) @Max(120) Integer age,
        @NotNull Gender gender) { }
