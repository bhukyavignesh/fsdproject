package com.obrs.dto.booking;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record SeatLockResponse(Long bookingId, Long scheduleId, List<String> seatNumbers, BigDecimal estimatedFare,
                               Instant lockExpiresAt, long lockSecondsRemaining) { }
