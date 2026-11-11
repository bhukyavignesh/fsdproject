package com.obrs.dto.booking;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

/**
 * Step 2: passenger details + payment. {@code paymentToken} is the one-time
 * token from the payment gateway's client SDK. Card data never touches this API.
 */
public record ConfirmBookingRequest(
        @NotEmpty @Size(max = 10) List<@Valid PassengerRequest> passengers,
        @NotBlank @Email @Size(max = 160) String contactEmail,
        @NotBlank @Pattern(regexp = "^[6-9]\\d{9}$") String contactPhone,
        @NotBlank @Size(max = 200) String paymentToken) { }
