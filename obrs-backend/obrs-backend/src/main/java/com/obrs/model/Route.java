package com.obrs.model;

import jakarta.persistence.*;

/** A city pair served by one or more schedules. */
@Entity
@Table(name = "routes", uniqueConstraints = @UniqueConstraint(name = "uk_route", columnNames = {"source_city", "destination_city"}))
public class Route {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_city", nullable = false, length = 80)
    private String sourceCity;

    @Column(name = "destination_city", nullable = false, length = 80)
    private String destinationCity;

    @Column(name = "distance_km", nullable = false)
    private int distanceKm;

    /** Typical travel time in minutes (stored as an integer for portability across MySQL/PostgreSQL). */
    @Column(name = "estimated_duration_minutes", nullable = false)
    private int estimatedDurationMinutes;

    protected Route() { }

    public Route(String sourceCity, String destinationCity, int distanceKm, int estimatedDurationMinutes) {
        this.sourceCity = sourceCity;
        this.destinationCity = destinationCity;
        this.distanceKm = distanceKm;
        this.estimatedDurationMinutes = estimatedDurationMinutes;
    }

    public Long getId() { return id; }
    public String getSourceCity() { return sourceCity; }
    public String getDestinationCity() { return destinationCity; }
    public int getDistanceKm() { return distanceKm; }
    public int getEstimatedDurationMinutes() { return estimatedDurationMinutes; }
}
