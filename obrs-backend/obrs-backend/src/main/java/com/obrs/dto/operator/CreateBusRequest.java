package com.obrs.dto.operator;

import com.obrs.model.BusType;
import jakarta.validation.constraints.*;

/** {@code layoutConfig} is optional; when omitted the default layout for {@code busType} is used. */
public record CreateBusRequest(
        @NotBlank @Size(max = 120) String busName,
        @NotBlank @Pattern(regexp = "^[A-Z]{2}\\d{1,2}[A-Z]{0,3}\\d{4}$", message = "e.g. KA01AB1234") String registrationNumber,
        @NotNull BusType busType,
        @Size(max = 2000) String layoutConfig) { }
