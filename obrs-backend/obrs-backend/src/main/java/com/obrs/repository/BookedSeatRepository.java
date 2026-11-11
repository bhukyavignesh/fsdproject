package com.obrs.repository;

import com.obrs.model.BookedSeat;
import com.obrs.model.SeatStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface BookedSeatRepository extends JpaRepository<BookedSeat, Long> {

    /**
     * Seats that are currently unavailable on a schedule: BOOKED, or LOCKED by a
     * booking whose lock has not yet expired.
     */
    @Query("""
            select bs from BookedSeat bs join bs.booking b
             where bs.schedule.id = :scheduleId
               and bs.activeFlag = true
               and (bs.seatStatus = :booked or (bs.seatStatus = :locked and b.lockExpiresAt > :now))
            """)
    List<BookedSeat> findUnavailableSeats(@Param("scheduleId") Long scheduleId,
                                          @Param("booked") SeatStatus booked,
                                          @Param("locked") SeatStatus locked,
                                          @Param("now") Instant now);

    /** Same as above, restricted to specific seat numbers. Used inside the schedule lock. */
    @Query("""
            select bs.seatNumber from BookedSeat bs
             where bs.schedule.id = :scheduleId
               and bs.activeFlag = true
               and bs.seatNumber in :seatNumbers
            """)
    List<String> findActiveSeatNumbers(@Param("scheduleId") Long scheduleId,
                                       @Param("seatNumbers") Collection<String> seatNumbers);

    /** Unavailable-seat counts for many schedules in one query (search results). */
    @Query("""
            select bs.schedule.id as scheduleId, count(bs) as taken from BookedSeat bs join bs.booking b
             where bs.schedule.id in :scheduleIds
               and bs.activeFlag = true
               and (bs.seatStatus = :booked or (bs.seatStatus = :locked and b.lockExpiresAt > :now))
             group by bs.schedule.id
            """)
    List<TakenSeatCount> countUnavailableByScheduleIds(@Param("scheduleIds") Collection<Long> scheduleIds,
                                                       @Param("booked") SeatStatus booked,
                                                       @Param("locked") SeatStatus locked,
                                                       @Param("now") Instant now);

    interface TakenSeatCount {
        Long getScheduleId();
        Long getTaken();
    }
}
