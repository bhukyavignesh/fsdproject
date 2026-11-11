package com.obrs.controller;

import com.obrs.dto.operator.*;
import com.obrs.security.CustomUserDetails;
import com.obrs.service.OperatorService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/** Operator portal: manage own fleet and trips. Role OPERATOR only. */
@RestController
@RequestMapping("/api/operator")
@PreAuthorize("hasRole('OPERATOR')")
@Validated
public class OperatorController {

    private final OperatorService operatorService;

    public OperatorController(OperatorService operatorService) {
        this.operatorService = operatorService;
    }

    @PostMapping("/buses")
    public ResponseEntity<BusResponse> createBus(@AuthenticationPrincipal CustomUserDetails user, @Valid @RequestBody CreateBusRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(operatorService.createBus(user.getOperatorId(), request));
    }

    @GetMapping("/buses")
    public List<BusResponse> buses(@AuthenticationPrincipal CustomUserDetails user) {
        return operatorService.listBuses(user.getOperatorId());
    }

    @PostMapping("/schedules")
    public ResponseEntity<ScheduleResponse> createSchedule(@AuthenticationPrincipal CustomUserDetails user,
                                                           @Valid @RequestBody CreateScheduleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(operatorService.createSchedule(user.getOperatorId(), request));
    }

    @GetMapping("/schedules")
    public List<ScheduleResponse> schedules(@AuthenticationPrincipal CustomUserDetails user,
                                            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return operatorService.listSchedules(user.getOperatorId(), from, to);
    }

    @GetMapping("/schedules/{scheduleId}/manifest")
    public List<ManifestEntry> manifest(@AuthenticationPrincipal CustomUserDetails user, @PathVariable @Positive Long scheduleId) {
        return operatorService.manifest(user.getOperatorId(), scheduleId);
    }

    @PostMapping("/schedules/{scheduleId}/cancel")
    public ScheduleResponse cancel(@AuthenticationPrincipal CustomUserDetails user, @PathVariable @Positive Long scheduleId) {
        return operatorService.cancelSchedule(user.getOperatorId(), scheduleId);
    }
}
