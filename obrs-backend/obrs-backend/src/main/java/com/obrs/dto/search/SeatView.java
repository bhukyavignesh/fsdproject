package com.obrs.dto.search;

import java.math.BigDecimal;

/** A cell in the seat map. {@code status}: AVAILABLE, LOCKED (held by someone) or BOOKED. */
public record SeatView(String seatNumber, String deck, int row, int column, String seatType, BigDecimal fare, String status) { }
