package com.obrs.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Fixed-window rate limiter for credential endpoints (login/register/refresh),
 * keyed by client IP + path. Slows down credential stuffing and sign-up spam.
 *
 * In-memory, so limits are per instance. For a multi-instance deployment back
 * this with Redis (e.g. Bucket4j + Redis) or enforce it at the API gateway.
 */
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_TRACKED_KEYS = 100_000;

    private final int limit;
    private final Duration window;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public RateLimitFilter(int limit, Duration window) {
        this.limit = limit;
        this.window = window;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !("POST".equals(request.getMethod()) && request.getRequestURI().startsWith("/api/auth/"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Instant now = Instant.now();
        if (windows.size() > MAX_TRACKED_KEYS) {
            windows.entrySet().removeIf(e -> e.getValue().isOver(now)); // bound memory
        }
        // getRemoteAddr() is the real client only if forward headers are handled by a trusted proxy
        // (server.forward-headers-strategy). Never trust a raw X-Forwarded-For header here.
        String key = request.getRemoteAddr() + "|" + request.getRequestURI();
        Window w = windows.compute(key, (k, existing) -> existing == null || existing.isOver(now) ? new Window(now.plus(window)) : existing);

        int count = w.increment();
        if (count > limit) {
            long retryAfter = Math.max(1, Duration.between(now, w.resetAt).toSeconds());
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(retryAfter));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"status\":429,\"code\":\"RATE_LIMITED\",\"message\":\"Too many requests. Try again in "
                    + retryAfter + " seconds.\"}");
            return;
        }
        chain.doFilter(request, response);
    }

    private static final class Window {
        private final Instant resetAt;
        private int count;

        Window(Instant resetAt) { this.resetAt = resetAt; }
        boolean isOver(Instant now) { return !now.isBefore(resetAt); }
        synchronized int increment() { return ++count; }
    }
}
