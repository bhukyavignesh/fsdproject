package com.obrs.model;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * A reservation. Created as PENDING when seats are locked; becomes CONFIRMED
 * (with a PNR) after passenger details + payment, or EXPIRED/CANCELLED.
 */
@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Assigned on confirmation. */
    @Column(name = "pnr_number", unique = true, length = 12)
    private String pnrNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "schedule_id", nullable = false)
    private Schedule schedule;

    @Column(name = "base_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseAmount = BigDecimal.ZERO;

    @Column(name = "tax_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "refund_amount", precision = 10, scale = 2)
    private BigDecimal refundAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "booking_status", nullable = false, length = 20)
    private BookingStatus bookingStatus = BookingStatus.PENDING;

    @Column(name = "contact_email", length = 160)
    private String contactEmail;

    @Column(name = "contact_phone", length = 20)
    private String contactPhone;

    @Column(name = "payment_reference", length = 80)
    private String paymentReference;

    /** When the temporary seat lock lapses (PENDING only). */
    @Column(name = "lock_expires_at")
    private Instant lockExpiresAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL)
    @OrderBy("seatNumber ASC")
    private List<BookedSeat> seats = new ArrayList<>();

    protected Booking() { }

    public Booking(User user, Schedule schedule, Instant lockExpiresAt) {
        this.user = user;
        this.schedule = schedule;
        this.lockExpiresAt = lockExpiresAt;
    }

    public void addSeat(BookedSeat seat) {
        seats.add(seat);
        seat.setBooking(this);
    }

    public boolean isLockExpired(Instant now) {
        return bookingStatus == BookingStatus.PENDING && lockExpiresAt != null && !lockExpiresAt.isAfter(now);
    }

    /** Release every live seat claim and move to a terminal status. */
    public void releaseSeats(BookingStatus terminalStatus, Instant now) {
        seats.forEach(BookedSeat::release);
        this.bookingStatus = terminalStatus;
        if (terminalStatus == BookingStatus.CANCELLED) {
            this.cancelledAt = now;
        }
        this.lockExpiresAt = null;
    }

    public void confirm(String pnr, String paymentReference, Instant now) {
        seats.forEach(BookedSeat::markBooked);
        this.pnrNumber = pnr;
        this.paymentReference = paymentReference;
        this.bookingStatus = BookingStatus.CONFIRMED;
        this.confirmedAt = now;
        this.lockExpiresAt = null;
    }

    public void setAmounts(BigDecimal base, BigDecimal tax, BigDecimal total) {
        this.baseAmount = base;
        this.taxAmount = tax;
        this.totalAmount = total;
    }

    public void setContact(String email, String phone) {
        this.contactEmail = email;
        this.contactPhone = phone;
    }

    public Long getId() { return id; }
    public String getPnrNumber() { return pnrNumber; }
    public User getUser() { return user; }
    public Schedule getSchedule() { return schedule; }
    public BigDecimal getBaseAmount() { return baseAmount; }
    public BigDecimal getTaxAmount() { return taxAmount; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public BigDecimal getRefundAmount() { return refundAmount; }
    public void setRefundAmount(BigDecimal refundAmount) { this.refundAmount = refundAmount; }
    public BookingStatus getBookingStatus() { return bookingStatus; }
    public String getContactEmail() { return contactEmail; }
    public String getContactPhone() { return contactPhone; }
    public String getPaymentReference() { return paymentReference; }
    public Instant getLockExpiresAt() { return lockExpiresAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getConfirmedAt() { return confirmedAt; }
    public Instant getCancelledAt() { return cancelledAt; }
    public List<BookedSeat> getSeats() { return seats; }
}
