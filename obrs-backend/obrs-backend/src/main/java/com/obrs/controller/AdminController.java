package com.obrs.controller;

import com.obrs.dto.admin.*;
import com.obrs.security.CustomUserDetails;
import com.obrs.service.AdminService;
import com.obrs.service.ScheduleSearchService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Platform administration. Role ADMIN only. */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminController {

    private final AdminService adminService;
    private final ScheduleSearchService searchService;

    public AdminController(AdminService adminService, ScheduleSearchService searchService) {
        this.adminService = adminService;
        this.searchService = searchService;
    }

    @PostMapping("/routes")
    public ResponseEntity<RouteResponse> createRoute(@Valid @RequestBody CreateRouteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.createRoute(request));
    }

    @GetMapping("/routes")
    public List<RouteResponse> routes() {
        return searchService.routes();
    }

    @PostMapping("/operators")
    public ResponseEntity<OperatorResponse> createOperator(@Valid @RequestBody CreateOperatorRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.createOperator(request));
    }

    @GetMapping("/operators")
    public List<OperatorResponse> operators() {
        return adminService.listOperators();
    }

    @PatchMapping("/users/{userId}/status")
    public ResponseEntity<Void> setStatus(@AuthenticationPrincipal CustomUserDetails admin, @PathVariable @Positive Long userId,
                                          @Valid @RequestBody UpdateUserStatusRequest request) {
        adminService.setUserEnabled(admin.getId(), userId, request.enabled());
        return ResponseEntity.noContent().build();
    }
}
