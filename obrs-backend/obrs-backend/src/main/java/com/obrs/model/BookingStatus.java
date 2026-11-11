package com.obrs.model;

/** PENDING = seats locked, awaiting passenger details/payment. EXPIRED = lock timed out. */
public enum BookingStatus {
    PENDING, CONFIRMED, CANCELLED, EXPIRED
}
