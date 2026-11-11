package com.obrs.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.Map;

/**
 * Uniform error body for every failure:
 * {"timestamp","status","code","message","path","details"}.
 * {@code code} is a stable machine-readable identifier the frontend can switch on.
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ApiError(Instant timestamp, int status, String code, String message, String path, Map<String, Object> details) {

    public static ApiError of(HttpStatus status, String code, String message, String path) {
        return new ApiError(Instant.now(), status.value(), code, message, path, Map.of());
    }

    public static ApiError of(HttpStatus status, String code, String message, String path, Map<String, Object> details) {
        return new ApiError(Instant.now(), status.value(), code, message, path, details == null ? Map.of() : details);
    }
}
