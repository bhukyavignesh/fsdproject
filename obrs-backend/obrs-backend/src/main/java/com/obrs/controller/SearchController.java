package com.obrs.controller;

import com.obrs.dto.admin.RouteResponse;
import com.obrs.dto.search.ScheduleSearchResponse;
import com.obrs.dto.search.SeatMapResponse;
import com.obrs.model.BusType;
import com.obrs.service.ScheduleSearchService;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Public, read-only search endpoints.
 * <pre>
 * GET /api/buses/search?source=Bengaluru&destination=Chennai&date=2026-11-20[&busType=AC_SLEEPER][&maxFare=1500]
 * GET /api/buses/schedules/{scheduleId}/seats
 * GET /api/buses/routes
 * </pre>
 */
@RestController
@RequestMapping("/api/buses")
@Validated
public class SearchController {

    private static final String CITY = "^[\\p{L} .-]+$";
    private final ScheduleSearchService searchService;

    public SearchController(ScheduleSearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping("/search")
    public List<ScheduleSearchResponse> search(
            @RequestParam @NotBlank @Size(max = 80) @Pattern(regexp = CITY) String source,
            @RequestParam @NotBlank @Size(max = 80) @Pattern(regexp = CITY) String destination,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) BusType busType,
            @RequestParam(required = false) @DecimalMin("0") BigDecimal maxFare) {
        return searchService.search(source, destination, date, busType, maxFare);
    }

    @GetMapping("/schedules/{scheduleId}/seats")
    public SeatMapResponse seatMap(@PathVariable @Positive Long scheduleId) {
        return searchService.seatMap(scheduleId);
    }

    @GetMapping("/routes")
    public List<RouteResponse> routes() {
        return searchService.routes();
    }
}
