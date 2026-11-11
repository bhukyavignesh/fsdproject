package com.obrs.model;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

/** A bus company that owns buses and publishes schedules. */
@Entity
@Table(name = "operators")
public class Operator {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 120)
    private String name;

    @Column(name = "contact_email", nullable = false, length = 160)
    private String contactEmail;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(nullable = false, precision = 2, scale = 1)
    private BigDecimal rating = BigDecimal.ZERO;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Operator() { }

    public Operator(String name, String contactEmail, String phone, BigDecimal rating) {
        this.name = name;
        this.contactEmail = contactEmail;
        this.phone = phone;
        this.rating = rating == null ? BigDecimal.ZERO : rating;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getContactEmail() { return contactEmail; }
    public String getPhone() { return phone; }
    public BigDecimal getRating() { return rating; }
    public void setRating(BigDecimal rating) { this.rating = rating; }
    public Instant getCreatedAt() { return createdAt; }
}
