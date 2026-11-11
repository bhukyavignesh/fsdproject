package com.obrs.dto.auth;

/** Returned by register/login/refresh. Access token is short-lived; refresh token is single-use. */
public record AuthResponse(String accessToken, String tokenType, long expiresIn, String refreshToken, UserResponse user) {
    public static AuthResponse bearer(String accessToken, long expiresIn, String refreshToken, UserResponse user) {
        return new AuthResponse(accessToken, "Bearer", expiresIn, refreshToken, user);
    }
}
