package com.obrs.model;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * One seat claimed by a booking.
 *
 * <p><b>Double-booking guard:</b> the table has UNIQUE(schedule_id, seat_number, active_flag).
 * {@code activeFlag} is TRUE while the seat is LOCKED or BOOKED and NULL once RELEASED.
 * Because NULLs never conflict in a unique index (PostgreSQL and MySQL), the database
 * itself guarantees at most one live claim per seat per schedule, even if application
 * logic were bypassed.</p>
 */
@Entity
@Table(name = "booked_seats",
        uniqueConstraints = @UniqueConstraint(name = "uk_seat_claim", columnNames = {"schedule_id", "seat_number", "active_flag"}))
public class BookedSeat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    /** Denormalised from booking so the unique constraint can include it. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "schedule_id", nullable = false)
    private Schedule schedule;

    @Column(name = "seat_number", nullable = false, length = 8)
    private String seatNumber;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal fare;

    @Column(name = "passenger_name", length = 100)
    private String passengerName;

    @Column(name = "passenger_age")
    private Integer passengerAge;

    @Enumerated(EnumType.STRING)
    @Column(name = "passenger_gender", length = 10)
    private Gender passengerGender;

    @Enumerated(EnumType.STRING)
    @Column(name = "seat_status", nullable = false, length = 10)
    private SeatStatus seatStatus = SeatStatus.LOCKED;

    @Column(name = "active_flag")
    private Boolean activeFlag = Boolean.TRUE;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected BookedSeat() { }

    public BookedSeat(Schedule schedule, String seatNumber, BigDecimal fare) {
        this.schedule = schedule;
        this.seatNumber = seatNumber;
        this.fare = fare;
    }

    void setBooking(Booking booking) { this.booking = booking; }

    public void assignPassenger(String name, int age, Gender gender) {
        this.passengerName = name;
        this.passengerAge = age;
        this.passengerGender = gender;
    }

    void markBooked() {
        this.seatStatus = SeatStatus.BOOKED;
        this.activeFlag = Boolean.TRUE;
    }

    void release() {
        this.seatStatus = SeatStatus.RELEASED;
        this.activeFlag = null;
    }

    public Long getId() { return id; }
    public Booking getBooking() { return booking; }
    public Schedule getSchedule() { return schedule; }
    public String getSeatNumber() { return seatNumber; }
    public BigDecimal getFare() { return fare; }
    public String getPassengerName() { return passengerName; }
    public Integer getPassengerAge() { return passengerAge; }
    public Gender getPassengerGender() { return passengerGender; }
    public SeatStatus getSeatStatus() { return seatStatus; }
    public Boolean getActiveFlag() { return activeFlag; }
}
