package com.obrs.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** {@code identifier} accepts either the email address or the 10-digit phone number. */
public record LoginRequest(@NotBlank @Size(max = 160) String identifier,
                           @NotBlank @Size(max = 72) String password) { }
