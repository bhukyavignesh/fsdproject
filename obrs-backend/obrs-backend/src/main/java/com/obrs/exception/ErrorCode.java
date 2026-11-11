package com.obrs.exception;

import org.springframework.http.HttpStatus;

/** Stable error codes returned in ApiError.code. */
public enum ErrorCode {
    VALIDATION_FAILED(HttpStatus.BAD_REQUEST),
    BAD_REQUEST(HttpStatus.BAD_REQUEST),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED),
    ACCOUNT_LOCKED(HttpStatus.LOCKED),
    ACCOUNT_DISABLED(HttpStatus.FORBIDDEN),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED),
    FORBIDDEN(HttpStatus.FORBIDDEN),
    NOT_FOUND(HttpStatus.NOT_FOUND),
    EMAIL_ALREADY_REGISTERED(HttpStatus.CONFLICT),
    PHONE_ALREADY_REGISTERED(HttpStatus.CONFLICT),
    DUPLICATE_RESOURCE(HttpStatus.CONFLICT),
    SEATS_UNAVAILABLE(HttpStatus.CONFLICT),
    INVALID_SEAT(HttpStatus.BAD_REQUEST),
    SEAT_LIMIT_EXCEEDED(HttpStatus.BAD_REQUEST),
    SCHEDULE_NOT_BOOKABLE(HttpStatus.CONFLICT),
    BOOKING_NOT_PENDING(HttpStatus.CONFLICT),
    LOCK_EXPIRED(HttpStatus.GONE),
    PASSENGER_SEAT_MISMATCH(HttpStatus.BAD_REQUEST),
    PAYMENT_FAILED(HttpStatus.PAYMENT_REQUIRED),
    CANCELLATION_NOT_ALLOWED(HttpStatus.CONFLICT),
    SCHEDULE_CONFLICT(HttpStatus.CONFLICT),
    CONCURRENT_UPDATE(HttpStatus.CONFLICT),
    SERVICE_BUSY(HttpStatus.SERVICE_UNAVAILABLE),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR);

    private final HttpStatus status;

    ErrorCode(HttpStatus status) { this.status = status; }

    public HttpStatus status() { return status; }
}
