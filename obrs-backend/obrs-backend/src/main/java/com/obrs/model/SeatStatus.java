package com.obrs.model;

/** LOCKED = temporarily held; BOOKED = paid; RELEASED = freed (kept for audit history). */
public enum SeatStatus {
    LOCKED, BOOKED, RELEASED
}
