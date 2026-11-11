package com.obrs.dto.admin;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

/** Creates an operator company together with its first OPERATOR login. */
public record CreateOperatorRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Email @Size(max = 160) String contactEmail,
        @NotBlank @Pattern(regexp = "^[6-9]\\d{9}$") String phone,
        @DecimalMin("0.0") @DecimalMax("5.0") BigDecimal rating,
        @NotNull @Valid OperatorAccount account) {

    public record OperatorAccount(
            @NotBlank @Size(min = 2, max = 100) String name,
            @NotBlank @Email @Size(max = 160) String email,
            @NotBlank @Pattern(regexp = "^[6-9]\\d{9}$") String phone,
            @NotBlank @Size(min = 8, max = 72)
            @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$") String password) { }
}
