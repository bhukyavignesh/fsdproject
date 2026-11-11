package com.obrs.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;

/**
 * Strongly-typed application settings (prefix {@code app.*}). Validated at
 * startup so a missing/weak secret stops the app instead of running insecurely.
 */
@Validated
@ConfigurationProperties(prefix = "app")
public record AppProperties(@Valid Jwt jwt, @Valid Security security, @Valid Booking booking, @Valid Seed seed) {

    public record Jwt(@NotBlank(message = "app.jwt.secret (JWT_SECRET) must be set") String secret,
                      @NotBlank String issuer,
                      @NotNull Duration accessTokenTtl,
                      @NotNull Duration refreshTokenTtl) { }

    public record Security(@Min(1) int maxFailedLogins,
                           @NotNull Duration lockoutDuration,
                           @Min(1) int authRateLimitPerMinute,
                           List<String> corsAllowedOrigins) { }

    public record Booking(@NotNull Duration seatLockDuration,
                          @Min(1) @Max(10) int maxSeatsPerBooking,
                          @NotNull @DecimalMin("0.0") BigDecimal taxRate,
                          @Min(1000) long lockCleanupIntervalMs,
                          @NotBlank String zoneId) { }

    public record Seed(boolean enabled, String adminEmail, String adminPassword) { }
}
