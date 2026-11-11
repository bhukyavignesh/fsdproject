package com.obrs.exception;

import java.util.Map;

/** Business exception translated to an ApiError by GlobalExceptionHandler. */
public class ApiException extends RuntimeException {

    private final ErrorCode code;
    private final transient Map<String, Object> details;

    public ApiException(ErrorCode code, String message) {
        this(code, message, Map.of());
    }

    public ApiException(ErrorCode code, String message, Map<String, Object> details) {
        super(message);
        this.code = code;
        this.details = details == null ? Map.of() : details;
    }

    public static ApiException notFound(String what) {
        return new ApiException(ErrorCode.NOT_FOUND, what + " not found");
    }

    public ErrorCode getCode() { return code; }
    public Map<String, Object> getDetails() { return details; }
}
