package com.obrs.controller;

import com.obrs.dto.auth.*;
import com.obrs.security.CustomUserDetails;
import com.obrs.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Authentication endpoints.
 * <pre>
 * POST /api/auth/register         public  -> 201 + tokens
 * POST /api/auth/login            public  -> tokens (email or phone + password)
 * POST /api/auth/refresh          public  -> rotated tokens
 * POST /api/auth/logout           bearer  -> revoke this device's refresh token
 * POST /api/auth/logout-all       bearer  -> revoke every session
 * POST /api/auth/change-password  bearer  -> new tokens, other sessions revoked
 * GET  /api/auth/me               bearer  -> current user
 * </pre>
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal CustomUserDetails user, @Valid @RequestBody RefreshRequest request) {
        authService.logout(user.getId(), request.refreshToken());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/logout-all")
    public ResponseEntity<Void> logoutAll(@AuthenticationPrincipal CustomUserDetails user) {
        authService.logoutAll(user.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/change-password")
    public AuthResponse changePassword(@AuthenticationPrincipal CustomUserDetails user, @Valid @RequestBody ChangePasswordRequest request) {
        return authService.changePassword(user.getId(), request);
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal CustomUserDetails user) {
        return authService.me(user.getId());
    }
}
