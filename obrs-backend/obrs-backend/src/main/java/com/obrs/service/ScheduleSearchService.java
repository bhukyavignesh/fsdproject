package com.obrs.service;

import com.obrs.config.AppProperties;
import com.obrs.dto.admin.RouteResponse;
import com.obrs.dto.search.ScheduleSearchResponse;
import com.obrs.dto.search.SeatMapResponse;
import com.obrs.dto.search.SeatView;
import com.obrs.exception.ApiException;
import com.obrs.exception.ErrorCode;
import com.obrs.model.BookedSeat;
import com.obrs.model.BusType;
import com.obrs.model.Schedule;
import com.obrs.model.ScheduleStatus;
import com.obrs.model.SeatStatus;
import com.obrs.repository.BookedSeatRepository;
import com.obrs.repository.RouteRepository;
import com.obrs.repository.ScheduleRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

/** Read-side: bus search, seat maps and route listing. */
@Service
@Transactional(readOnly = true)
public class ScheduleSearchService {

    private static final int MAX_DAYS_AHEAD = 120;

    private final ScheduleRepository scheduleRepository;
    private final BookedSeatRepository bookedSeatRepository;
    private final RouteRepository routeRepository;
    private final SeatLayoutService seatLayoutService;
    private final Clock clock;
    private final ZoneId zone;

    public ScheduleSearchService(ScheduleRepository scheduleRepository, BookedSeatRepository bookedSeatRepository,
                                 RouteRepository routeRepository, SeatLayoutService seatLayoutService,
                                 Clock clock, AppProperties props) {
        this.scheduleRepository = scheduleRepository;
        this.bookedSeatRepository = bookedSeatRepository;
        this.routeRepository = routeRepository;
        this.seatLayoutService = seatLayoutService;
        this.clock = clock;
        this.zone = ZoneId.of(props.booking().zoneId());
    }

    public List<ScheduleSearchResponse> search(String source, String destination, LocalDate date, BusType busType, BigDecimal maxFare) {
        if (source.equalsIgnoreCase(destination)) {
            throw new ApiException(ErrorCode.BAD_REQUEST, "Source and destination must differ");
        }
        LocalDate today = LocalDate.now(clock.withZone(zone));
        if (date.isBefore(today) || date.isAfter(today.plusDays(MAX_DAYS_AHEAD))) {
            throw new ApiException(ErrorCode.BAD_REQUEST, "Date must be between today and " + MAX_DAYS_AHEAD + " days ahead");
        }

        List<Schedule> schedules = scheduleRepository.searchSchedules(
                source.trim(), destination.trim(), date.atStartOfDay(), date.plusDays(1).atStartOfDay(),
                LocalDateTime.now(clock.withZone(zone)), ScheduleStatus.SCHEDULED, busType, maxFare);
        if (schedules.isEmpty()) {
            return List.of();
        }

        Map<Long, Long> taken = bookedSeatRepository.countUnavailableByScheduleIds(
                        schedules.stream().map(Schedule::getId).toList(), SeatStatus.BOOKED, SeatStatus.LOCKED, clock.instant())
                .stream().collect(Collectors.toMap(BookedSeatRepository.TakenSeatCount::getScheduleId,
                        BookedSeatRepository.TakenSeatCount::getTaken));

        return schedules.stream().map(s -> {
            var bus = s.getBus();
            int available = (int) Math.max(0, bus.getTotalSeats() - taken.getOrDefault(s.getId(), 0L));
            return new ScheduleSearchResponse(
                    s.getId(), bus.getOperator().getName(), bus.getOperator().getRating(),
                    bus.getBusName(), bus.getBusType().name(), bus.getBusType().isAirConditioned(), bus.getBusType().isSleeper(),
                    s.getRoute().getSourceCity(), s.getRoute().getDestinationCity(),
                    s.getDepartureTime(), s.getArrivalTime(),
                    Duration.between(s.getDepartureTime(), s.getArrivalTime()).toMinutes(),
                    s.getBaseFare(), bus.getTotalSeats(), available);
        }).toList();
    }

    public SeatMapResponse seatMap(Long scheduleId) {
        Schedule schedule = scheduleRepository.findDetailedById(scheduleId)
                .filter(s -> s.getStatus() == ScheduleStatus.SCHEDULED)
                .orElseThrow(() -> ApiException.notFound("Schedule"));

        Map<String, String> unavailable = new HashMap<>();
        Instant now = clock.instant();
        for (BookedSeat bs : bookedSeatRepository.findUnavailableSeats(scheduleId, SeatStatus.BOOKED, SeatStatus.LOCKED, now)) {
            unavailable.put(bs.getSeatNumber(), bs.getSeatStatus() == SeatStatus.BOOKED ? "BOOKED" : "LOCKED");
        }

        SeatLayoutService.LayoutConfig layout = seatLayoutService.layoutOf(schedule.getBus());
        Map<String, List<SeatLayoutService.SeatPosition>> byDeck = seatLayoutService.seatsOf(layout).stream()
                .collect(Collectors.groupingBy(SeatLayoutService.SeatPosition::deck, LinkedHashMap::new, Collectors.toList()));

        List<SeatMapResponse.Deck> decks = new ArrayList<>();
        for (SeatLayoutService.DeckConfig deckCfg : layout.decks()) {
            List<List<SeatView>> grid = new ArrayList<>();
            for (int r = 0; r < deckCfg.rows(); r++) {
                List<SeatView> row = new ArrayList<>(Collections.nCopies(deckCfg.columns(), (SeatView) null));
                grid.add(row);
            }
            for (SeatLayoutService.SeatPosition p : byDeck.getOrDefault(deckCfg.name(), List.of())) {
                grid.get(p.row()).set(p.column(), new SeatView(p.seatNumber(), p.deck(), p.row(), p.column(), p.seatType(),
                        schedule.getBaseFare(), unavailable.getOrDefault(p.seatNumber(), "AVAILABLE")));
            }
            decks.add(new SeatMapResponse.Deck(deckCfg.name(), grid));
        }

        int total = schedule.getBus().getTotalSeats();
        return new SeatMapResponse(scheduleId, schedule.getBus().getBusType().name(), total,
                Math.max(0, total - unavailable.size()), decks);
    }

    public List<RouteResponse> routes() {
        return routeRepository.findAll(Sort.by("sourceCity", "destinationCity")).stream().map(RouteResponse::from).toList();
    }
}
