package com.obrs.service;

import com.obrs.model.BookingStatus;
import com.obrs.repository.BookingRepository;
import com.obrs.repository.RefreshTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.util.List;

/**
 * Background housekeeping. Expired seat locks are also released lazily whenever
 * someone locks seats on the same schedule, so correctness never depends on
 * this job; it just keeps availability counts fresh.
 *
 * With several app instances each runs this job; that is safe because every
 * release happens under the schedule row lock. Use ShedLock to run it once.
 */
@Component
public class SeatLockCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(SeatLockCleanupJob.class);

    private final BookingRepository bookingRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final BookingService bookingService;
    private final Clock clock;

    public SeatLockCleanupJob(BookingRepository bookingRepository, RefreshTokenRepository refreshTokenRepository,
                              BookingService bookingService, Clock clock) {
        this.bookingRepository = bookingRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.bookingService = bookingService;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${app.booking.lock-cleanup-interval-ms:60000}", initialDelay = 30_000)
    public void releaseExpiredSeatLocks() {
        List<Long> scheduleIds = bookingRepository.findScheduleIdsWithExpiredLocks(
                BookingStatus.PENDING, clock.instant(), PageRequest.of(0, 200));
        int released = 0;
        for (Long scheduleId : scheduleIds) {
            try {
                released += bookingService.releaseExpiredLocks(scheduleId); // own transaction per schedule
            } catch (RuntimeException e) {
                log.warn("Could not release locks on schedule {}: {}", scheduleId, e.getMessage());
            }
        }
        if (released > 0) {
            log.info("Released {} expired seat lock(s)", released);
        }
    }

    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void purgeExpiredRefreshTokens() {
        int deleted = refreshTokenRepository.deleteExpired(clock.instant().minus(Duration.ofDays(1)));
        log.info("Purged {} expired refresh token(s)", deleted);
    }
}
