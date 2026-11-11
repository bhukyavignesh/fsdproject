package com.obrs.dto.admin;

import com.obrs.model.Route;

public record RouteResponse(Long id, String sourceCity, String destinationCity, int distanceKm, int estimatedDurationMinutes) {
    public static RouteResponse from(Route r) {
        return new RouteResponse(r.getId(), r.getSourceCity(), r.getDestinationCity(), r.getDistanceKm(), r.getEstimatedDurationMinutes());
    }
}
