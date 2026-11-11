package com.obrs.dto.search;

import java.util.List;

/**
 * Seat layout for a schedule. Each deck is a grid of rows; a {@code null} cell
 * is an aisle/gap. This maps 1:1 onto the frontend seat-map component.
 */
public record SeatMapResponse(Long scheduleId, String busType, int totalSeats, int availableSeats, List<Deck> decks) {
    public record Deck(String name, List<List<SeatView>> grid) { }
}
