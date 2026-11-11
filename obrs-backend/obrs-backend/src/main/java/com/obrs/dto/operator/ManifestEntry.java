package com.obrs.dto.operator;

/** Passenger manifest line for an operator's trip (no payment data). */
public record ManifestEntry(String pnrNumber, String seatNumber, String passengerName, Integer passengerAge, String passengerGender, String contactPhone) { }
