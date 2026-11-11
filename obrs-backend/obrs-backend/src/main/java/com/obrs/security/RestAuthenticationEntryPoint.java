package com.obrs.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.obrs.dto.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/** JSON 401 for missing/invalid/expired tokens (instead of an HTML page or redirect). */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public RestAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException ex) throws IOException {
        Object reason = request.getAttribute(JwtAuthenticationFilter.ATTR_AUTH_ERROR);
        String code = reason != null ? reason.toString() : "UNAUTHENTICATED";
        String message = switch (code) {
            case "TOKEN_EXPIRED" -> "Access token expired. Refresh your session.";
            case "TOKEN_REVOKED" -> "Session is no longer valid. Please log in again.";
            case "TOKEN_INVALID" -> "Invalid access token.";
            default -> "Authentication is required.";
        };
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("WWW-Authenticate", "Bearer");
        objectMapper.writeValue(response.getOutputStream(),
                ApiError.of(HttpStatus.UNAUTHORIZED, code, message, request.getRequestURI()));
    }
}
