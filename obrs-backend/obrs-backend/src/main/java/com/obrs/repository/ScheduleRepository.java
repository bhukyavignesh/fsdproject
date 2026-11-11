package com.obrs.repository;

import com.obrs.model.BusType;
import com.obrs.model.Schedule;
import com.obrs.model.ScheduleStatus;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    /**
     * Dynamic bus search by source, destination and journey date (passed as the
     * [dayStart, dayEnd) window). Optional filters are ignored when null.
     * Bus, operator and route are fetched in the same query (no N+1).
     */
    @Query("""
            select s from Schedule s
              join fetch s.route r
              join fetch s.bus b
              join fetch b.operator o
             where lower(r.sourceCity) = lower(:source)
               and lower(r.destinationCity) = lower(:destination)
               and s.departureTime >= :dayStart
               and s.departureTime < :dayEnd
               and s.departureTime > :notBefore
               and s.status = :status
               and b.active = true
               and (:busType is null or b.busType = :busType)
               and (:maxFare is null or s.baseFare <= :maxFare)
             order by s.departureTime asc
            """)
    List<Schedule> searchSchedules(@Param("source") String source,
                                   @Param("destination") String destination,
                                   @Param("dayStart") LocalDateTime dayStart,
                                   @Param("dayEnd") LocalDateTime dayEnd,
                                   @Param("notBefore") LocalDateTime notBefore,
                                   @Param("status") ScheduleStatus status,
                                   @Param("busType") BusType busType,
                                   @Param("maxFare") BigDecimal maxFare);

    /**
     * SELECT ... FOR UPDATE on the schedule row. Every seat-claiming transaction
     * for the same schedule queues here, so check-then-insert is race free.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "5000"))
    @Query("select s from Schedule s join fetch s.bus b join fetch s.route r where s.id = :id")
    Optional<Schedule> findByIdForUpdate(@Param("id") Long id);

    @Query("select s from Schedule s join fetch s.bus b join fetch b.operator join fetch s.route where s.id = :id")
    Optional<Schedule> findDetailedById(@Param("id") Long id);

    @Query("""
            select s from Schedule s join fetch s.route join fetch s.bus b
             where b.operator.id = :operatorId
               and s.departureTime >= :from and s.departureTime < :to
             order by s.departureTime
            """)
    List<Schedule> findForOperator(@Param("operatorId") Long operatorId,
                                   @Param("from") LocalDateTime from,
                                   @Param("to") LocalDateTime to);

    /** Prevents publishing two overlapping trips for the same bus. */
    @Query("""
            select case when count(s) > 0 then true else false end from Schedule s
             where s.bus.id = :busId and s.status = :status
               and s.departureTime < :arrival and s.arrivalTime > :departure
            """)
    boolean existsOverlapping(@Param("busId") Long busId,
                              @Param("departure") LocalDateTime departure,
                              @Param("arrival") LocalDateTime arrival,
                              @Param("status") ScheduleStatus status);
}
