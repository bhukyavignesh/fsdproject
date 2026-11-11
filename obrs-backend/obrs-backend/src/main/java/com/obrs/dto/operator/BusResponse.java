package com.obrs.dto.operator;

import com.obrs.model.Bus;

public record BusResponse(Long id, String busName, String registrationNumber, String busType, int totalSeats, String layoutConfig, boolean active) {
    public static BusResponse from(Bus b) {
        return new BusResponse(b.getId(), b.getBusName(), b.getRegistrationNumber(), b.getBusType().name(), b.getTotalSeats(), b.getLayoutConfig(), b.isActive());
    }
}
