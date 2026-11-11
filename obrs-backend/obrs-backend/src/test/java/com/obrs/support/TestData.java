package com.obrs.support;

import com.obrs.model.*;
import com.obrs.repository.*;
import com.obrs.service.SeatLayoutService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

/** Builds fixtures directly through repositories. */
@Component
public class TestData {

    private static final AtomicInteger SEQ = new AtomicInteger(100);

    private final UserRepository users;
    private final OperatorRepository operators;
    private final RouteRepository routes;
    private final BusRepository buses;
    private final ScheduleRepository schedules;
    private final SeatLayoutService layouts;
    private final PasswordEncoder encoder;

    public TestData(UserRepository users, OperatorRepository operators, RouteRepository routes, BusRepository buses,
                    ScheduleRepository schedules, SeatLayoutService layouts, PasswordEncoder encoder) {
        this.users = users;
        this.operators = operators;
        this.routes = routes;
        this.buses = buses;
        this.schedules = schedules;
        this.layouts = layouts;
        this.encoder = encoder;
    }

    public User user(Role role) {
        int n = SEQ.incrementAndGet();
        return users.save(new User("User " + n, "user" + n + "@test.local", "98" + String.format("%08d", n), encoder.encode("Passw0rd!"), role));
    }

    public Schedule schedule() {
        int n = SEQ.incrementAndGet();
        Operator op = operators.save(new Operator("Op " + UUID.randomUUID(), "op" + n + "@test.local", "9000000" + String.format("%03d", n % 1000), BigDecimal.valueOf(4.2)));
        SeatLayoutService.LayoutConfig layout = layouts.defaultLayout(BusType.AC_SEATER);
        Bus bus = buses.save(new Bus(op, "Bus " + n, "KA01AB" + String.format("%04d", n), BusType.AC_SEATER, layouts.seatsOf(layout).size(), layouts.toJson(layout)));
        Route route = routes.save(new Route("Origin " + letters(n), "Destination " + letters(n), 300, 360));
        LocalDateTime dep = LocalDateTime.now(ZoneId.of("Asia/Kolkata")).plusDays(2).withNano(0);
        return schedules.save(new Schedule(bus, route, dep, dep.plusHours(6), new BigDecimal("500.00")));
    }

    /** City names must be letters only (search validates them). */
    private static String letters(int n) {
        StringBuilder sb = new StringBuilder();
        do { sb.append((char) ('A' + n % 26)); n /= 26; } while (n > 0);
        return sb.toString();
    }
}
