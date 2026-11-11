package com.obrs.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.obrs.exception.ApiException;
import com.obrs.exception.ErrorCode;
import com.obrs.model.Bus;
import com.obrs.model.BusType;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Parses and validates a bus {@code layoutConfig} JSON and derives seat numbers.
 *
 * <pre>
 * {"decks":[{"name":"LOWER","prefix":"L","rows":6,"columns":4,"aisleColumns":[1],"seatType":"SLEEPER"}, ...]}
 * </pre>
 * Columns listed in {@code aisleColumns} (0-based) are gaps. Seats are numbered
 * row by row per deck: prefix + running number (e.g. L1..L18, or 1..40 with no prefix).
 */
@Service
public class SeatLayoutService {

    public record DeckConfig(String name, String prefix, int rows, int columns, List<Integer> aisleColumns, String seatType) { }
    public record LayoutConfig(List<DeckConfig> decks) { }
    /** A concrete seat derived from the layout. */
    public record SeatPosition(String seatNumber, String deck, int row, int column, String seatType) { }

    private static final int MAX_SEATS = 60;
    private final ObjectMapper objectMapper;

    public SeatLayoutService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public LayoutConfig defaultLayout(BusType type) {
        return switch (type) {
            case AC_SLEEPER, NON_AC_SLEEPER -> new LayoutConfig(List.of(
                    new DeckConfig("LOWER", "L", 6, 4, List.of(1), "SLEEPER"),
                    new DeckConfig("UPPER", "U", 6, 4, List.of(1), "SLEEPER")));
            case AC_SEMI_SLEEPER -> new LayoutConfig(List.of(new DeckConfig("LOWER", "", 9, 5, List.of(2), "SEMI_SLEEPER")));
            case AC_SEATER, NON_AC_SEATER -> new LayoutConfig(List.of(new DeckConfig("LOWER", "", 10, 5, List.of(2), "SEATER")));
        };
    }

    public String toJson(LayoutConfig layout) {
        try {
            return objectMapper.writeValueAsString(layout);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot serialise layout", e);
        }
    }

    /** Parses and fully validates operator-supplied layout JSON. */
    public LayoutConfig parseAndValidate(String json) {
        LayoutConfig layout;
        try {
            layout = objectMapper.readValue(json, LayoutConfig.class);
        } catch (JsonProcessingException e) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "layoutConfig is not valid JSON");
        }
        validate(layout);
        return layout;
    }

    public LayoutConfig layoutOf(Bus bus) {
        try {
            return objectMapper.readValue(bus.getLayoutConfig(), LayoutConfig.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Corrupt layout for bus " + bus.getId(), e);
        }
    }

    public List<SeatPosition> seatsOf(LayoutConfig layout) {
        List<SeatPosition> seats = new ArrayList<>();
        for (DeckConfig deck : layout.decks()) {
            Set<Integer> aisles = new HashSet<>(deck.aisleColumns() == null ? List.of() : deck.aisleColumns());
            int n = 1;
            for (int r = 0; r < deck.rows(); r++) {
                for (int c = 0; c < deck.columns(); c++) {
                    if (aisles.contains(c)) continue;
                    String prefix = deck.prefix() == null ? "" : deck.prefix();
                    seats.add(new SeatPosition(prefix + n++, deck.name(), r, c, deck.seatType()));
                }
            }
        }
        return seats;
    }

    public Set<String> seatNumbersOf(Bus bus) {
        Set<String> numbers = new LinkedHashSet<>();
        seatsOf(layoutOf(bus)).forEach(s -> numbers.add(s.seatNumber()));
        return numbers;
    }

    private void validate(LayoutConfig layout) {
        if (layout == null || layout.decks() == null || layout.decks().isEmpty() || layout.decks().size() > 2) {
            throw invalid("layout must have 1 or 2 decks");
        }
        Set<String> prefixes = new HashSet<>();
        Set<String> names = new HashSet<>();
        for (DeckConfig d : layout.decks()) {
            if (d.name() == null || !d.name().matches("^[A-Z_]{1,12}$") || !names.add(d.name())) throw invalid("deck names must be unique, e.g. LOWER/UPPER");
            String prefix = d.prefix() == null ? "" : d.prefix();
            if (!prefix.matches("^[A-Z]?$") || !prefixes.add(prefix)) throw invalid("deck prefix must be a unique single capital letter or empty");
            if (d.rows() < 1 || d.rows() > 20) throw invalid("rows must be 1-20");
            if (d.columns() < 2 || d.columns() > 6) throw invalid("columns must be 2-6");
            if (d.seatType() == null || !Set.of("SEATER", "SLEEPER", "SEMI_SLEEPER").contains(d.seatType())) throw invalid("seatType must be SEATER, SLEEPER or SEMI_SLEEPER");
            if (d.aisleColumns() != null && d.aisleColumns().stream().anyMatch(c -> c == null || c < 0 || c >= d.columns())) throw invalid("aisle column out of range");
        }
        int total = seatsOf(layout).size();
        if (total < 1 || total > MAX_SEATS) throw invalid("total seats must be 1-" + MAX_SEATS);
    }

    private ApiException invalid(String msg) {
        return new ApiException(ErrorCode.VALIDATION_FAILED, "Invalid layoutConfig: " + msg);
    }
}
