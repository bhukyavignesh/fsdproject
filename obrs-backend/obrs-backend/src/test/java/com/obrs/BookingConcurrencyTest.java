package com.obrs;

import com.obrs.dto.booking.SeatLockRequest;
import com.obrs.exception.ApiException;
import com.obrs.model.Role;
import com.obrs.model.Schedule;
import com.obrs.model.User;
import com.obrs.repository.BookedSeatRepository;
import com.obrs.service.BookingService;
import com.obrs.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.test.context.ActiveProfiles;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Many users race for the same seat at the same instant. Exactly one must win.
 */
@SpringBootTest
@ActiveProfiles("test")
class BookingConcurrencyTest {

    @Autowired BookingService bookingService;
    @Autowired BookedSeatRepository bookedSeatRepository;
    @Autowired TestData testData;

    @Test
    void onlyOneOfManyConcurrentRequestsCanLockTheSameSeat() throws Exception {
        Schedule schedule = testData.schedule();
        int threads = 12;
        List<User> racers = new ArrayList<>();
        for (int i = 0; i < threads; i++) racers.add(testData.user(Role.PASSENGER));

        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger wins = new AtomicInteger();
        AtomicInteger conflicts = new AtomicInteger();
        List<Future<?>> futures = new ArrayList<>();

        for (User u : racers) {
            futures.add(pool.submit(() -> {
                start.await();
                try {
                    bookingService.lockSeats(u.getId(), new SeatLockRequest(schedule.getId(), List.of("5", "6")));
                    wins.incrementAndGet();
                } catch (ApiException | DataAccessException e) {
                    conflicts.incrementAndGet();
                }
                return null;
            }));
        }
        start.countDown();
        for (Future<?> f : futures) f.get(30, TimeUnit.SECONDS);
        pool.shutdown();

        assertThat(wins.get()).isEqualTo(1);
        assertThat(conflicts.get()).isEqualTo(threads - 1);
        assertThat(bookedSeatRepository.findActiveSeatNumbers(schedule.getId(), List.of("5", "6")))
                .containsExactlyInAnyOrder("5", "6"); // claimed once, not twice
    }

    @Test
    void differentSeatsOnTheSameBusCanBeLockedInParallel() throws Exception {
        Schedule schedule = testData.schedule();
        ExecutorService pool = Executors.newFixedThreadPool(4);
        List<Future<?>> futures = new ArrayList<>();
        for (int i = 1; i <= 4; i++) {
            String seat = String.valueOf(i);
            User u = testData.user(Role.PASSENGER);
            futures.add(pool.submit(() -> bookingService.lockSeats(u.getId(), new SeatLockRequest(schedule.getId(), List.of(seat)))));
        }
        for (Future<?> f : futures) f.get(30, TimeUnit.SECONDS); // none throws
        pool.shutdown();
        assertThat(bookedSeatRepository.findActiveSeatNumbers(schedule.getId(), List.of("1", "2", "3", "4"))).hasSize(4);
    }
}
