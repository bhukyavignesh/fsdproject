package com.obrs.repository;

import com.obrs.model.Booking;
import com.obrs.model.BookingStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    /** Every user-facing lookup is scoped by owner to prevent IDOR (reading others' bookings). */
    @EntityGraph(attributePaths = {"seats", "schedule", "schedule.route", "schedule.bus", "schedule.bus.operator"})
    Optional<Booking> findByIdAndUserId(Long id, Long userId);

    @EntityGraph(attributePaths = {"seats", "schedule", "schedule.route", "schedule.bus", "schedule.bus.operator"})
    Optional<Booking> findByPnrNumberAndUserId(String pnrNumber, Long userId);

    @EntityGraph(attributePaths = {"schedule", "schedule.route", "schedule.bus", "schedule.bus.operator"})
    List<Booking> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<Booking> findByUserIdAndScheduleIdAndBookingStatus(Long userId, Long scheduleId, BookingStatus status);

    @Query("select b from Booking b where b.schedule.id = :scheduleId and b.bookingStatus = :status and b.lockExpiresAt <= :now")
    List<Booking> findExpiredLocks(@Param("scheduleId") Long scheduleId,
                                   @Param("status") BookingStatus status,
                                   @Param("now") Instant now);

    @Query("select distinct b.schedule.id from Booking b where b.bookingStatus = :status and b.lockExpiresAt <= :now")
    List<Long> findScheduleIdsWithExpiredLocks(@Param("status") BookingStatus status, @Param("now") Instant now, Pageable pageable);

    @EntityGraph(attributePaths = {"seats", "user"})
    List<Booking> findByScheduleIdAndBookingStatusOrderByConfirmedAtAsc(Long scheduleId, BookingStatus status);

    /** Cheap lookup of the schedule id so callers can lock the schedule BEFORE loading booking state. */
    @Query("select b.schedule.id from Booking b where b.id = :id and b.user.id = :userId")
    Optional<Long> findScheduleIdByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    @Query("select b.schedule.id from Booking b where b.pnrNumber = :pnr and b.user.id = :userId")
    Optional<Long> findScheduleIdByPnrAndUserId(@Param("pnr") String pnr, @Param("userId") Long userId);

    boolean existsByPnrNumber(String pnrNumber);

    long countByUserIdAndBookingStatus(Long userId, BookingStatus status);
}
