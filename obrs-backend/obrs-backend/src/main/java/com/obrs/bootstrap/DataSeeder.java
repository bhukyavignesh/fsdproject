package com.obrs.bootstrap;

import com.obrs.config.AppProperties;
import com.obrs.model.*;
import com.obrs.repository.*;
import com.obrs.service.SeatLayoutService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

/**
 * Seeds demo data on an empty database when app.seed.enabled=true (dev profile).
 * Never enabled in prod. Demo accounts:
 *   admin    : SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (default admin@obrs.local / Admin@12345 in dev)
 *   operator : operator@obrs.local / Operator@123
 *   passenger: demo@obrs.local / Demo@1234
 */
@Component
@ConditionalOnProperty(prefix = "app.seed", name = "enabled", havingValue = "true")
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository users;
    private final OperatorRepository operators;
    private final RouteRepository routes;
    private final BusRepository buses;
    private final ScheduleRepository schedules;
    private final SeatLayoutService layouts;
    private final PasswordEncoder encoder;
    private final AppProperties props;

    public DataSeeder(UserRepository users, OperatorRepository operators, RouteRepository routes, BusRepository buses,
                      ScheduleRepository schedules, SeatLayoutService layouts, PasswordEncoder encoder, AppProperties props) {
        this.users = users;
        this.operators = operators;
        this.routes = routes;
        this.buses = buses;
        this.schedules = schedules;
        this.layouts = layouts;
        this.encoder = encoder;
        this.props = props;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.count() > 0) {
            return;
        }
        String adminPassword = props.seed().adminPassword();
        if (adminPassword == null || adminPassword.isBlank()) {
            log.warn("app.seed.admin-password is empty; skipping seed");
            return;
        }
        log.info("Seeding demo data...");

        users.save(new User("Platform Admin", props.seed().adminEmail(), "9000000001", encoder.encode(adminPassword), Role.ADMIN));
        users.save(new User("Demo Passenger", "demo@obrs.local", "9876543210", encoder.encode("Demo@1234"), Role.PASSENGER));

        Operator saffron = operators.save(new Operator("Saffron Line Travels", "ops@saffronline.example", "9000000002", new BigDecimal("4.4")));
        Operator meridian = operators.save(new Operator("Blue Meridian Coaches", "ops@bluemeridian.example", "9000000003", new BigDecimal("4.1")));
        User opUser = new User("Saffron Ops", "operator@obrs.local", "9123456780", encoder.encode("Operator@123"), Role.OPERATOR);
        opUser.setOperator(saffron);
        users.save(opUser);

        List<Bus> fleet = List.of(
                bus(saffron, "Saffron Volvo 9600", "KA01AB1234", BusType.AC_SLEEPER),
                bus(saffron, "Saffron Express", "KA01AB5678", BusType.AC_SEATER),
                bus(meridian, "Meridian Night Rider", "TN09CD4321", BusType.NON_AC_SLEEPER),
                bus(meridian, "Meridian Comfort", "TN09CD8765", BusType.AC_SEMI_SLEEPER));

        List<Route> routeList = List.of(
                routes.save(new Route("Bengaluru", "Chennai", 346, 375)),
                routes.save(new Route("Chennai", "Bengaluru", 346, 375)),
                routes.save(new Route("Bengaluru", "Hyderabad", 570, 600)),
                routes.save(new Route("Mumbai", "Pune", 150, 210)));

        LocalDate today = LocalDate.now(ZoneId.of(props.booking().zoneId()));
        LocalTime[] departures = {LocalTime.of(6, 30), LocalTime.of(14, 0), LocalTime.of(21, 30), LocalTime.of(23, 15)};
        for (int day = 1; day <= 7; day++) {
            for (int r = 0; r < routeList.size(); r++) {
                Route route = routeList.get(r);
                for (int i = 0; i < fleet.size(); i++) {
                    // Each bus serves one route per day so trips never overlap.
                    if ((i + day) % routeList.size() != r) continue;
                    Bus b = fleet.get(i);
                    var dep = today.plusDays(day).atTime(departures[i]);
                    BigDecimal fare = BigDecimal.valueOf(route.getDistanceKm() * (b.getBusType().isSleeper() ? 3L : 2L)).setScale(2);
                    schedules.save(new Schedule(b, route, dep, dep.plusMinutes(route.getEstimatedDurationMinutes()), fare));
                }
            }
        }
        log.info("Seed complete: {} schedules", schedules.count());
    }

    private Bus bus(Operator op, String name, String reg, BusType type) {
        SeatLayoutService.LayoutConfig layout = layouts.defaultLayout(type);
        return buses.save(new Bus(op, name, reg, type, layouts.seatsOf(layout).size(), layouts.toJson(layout)));
    }
}
