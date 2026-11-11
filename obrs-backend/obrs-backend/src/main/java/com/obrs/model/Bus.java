package com.obrs.model;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * A physical bus. {@code layoutConfig} is a JSON document describing decks,
 * rows, columns and aisles; seat numbers are derived from it.
 */
@Entity
@Table(name = "buses")
public class Bus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "operator_id", nullable = false)
    private Operator operator;

    @Column(name = "bus_name", nullable = false, length = 120)
    private String busName;

    @Column(name = "registration_number", nullable = false, unique = true, length = 20)
    private String registrationNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "bus_type", nullable = false, length = 30)
    private BusType busType;

    @Column(name = "total_seats", nullable = false)
    private int totalSeats;

    @Column(name = "layout_config", nullable = false, length = 2000)
    private String layoutConfig;

    @Column(nullable = false)
    private boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Bus() { }

    public Bus(Operator operator, String busName, String registrationNumber, BusType busType, int totalSeats, String layoutConfig) {
        this.operator = operator;
        this.busName = busName;
        this.registrationNumber = registrationNumber;
        this.busType = busType;
        this.totalSeats = totalSeats;
        this.layoutConfig = layoutConfig;
    }

    public Long getId() { return id; }
    public Operator getOperator() { return operator; }
    public String getBusName() { return busName; }
    public String getRegistrationNumber() { return registrationNumber; }
    public BusType getBusType() { return busType; }
    public int getTotalSeats() { return totalSeats; }
    public String getLayoutConfig() { return layoutConfig; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
