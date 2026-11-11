package com.obrs.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Reads "Authorization: Bearer &lt;jwt&gt;", validates it and populates the
 * SecurityContext. Invalid tokens are not rejected here; the request simply
 * stays anonymous and the entry point returns 401 if the endpoint needs auth.
 *
 * Besides the signature, the filter checks against the database that the user
 * still exists, is enabled, is not locked, and that the token version matches,
 * so revoked tokens stop working immediately.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    public static final String ATTR_AUTH_ERROR = "obrs.auth.error";
    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private static final String BEARER = "Bearer ";

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtService jwtService, CustomUserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith(BEARER)) {
            chain.doFilter(request, response);
            return;
        }

        String token = header.substring(BEARER.length()).trim();
        try {
            Claims claims = jwtService.parseAndValidate(token);
            Long userId = Long.valueOf(claims.getSubject());
            Integer tokenVersion = claims.get(JwtService.CLAIM_TOKEN_VERSION, Integer.class);

            userDetailsService.loadUserById(userId)
                    .filter(CustomUserDetails::isEnabled)
                    .filter(CustomUserDetails::isAccountNonLocked)
                    .filter(u -> tokenVersion != null && tokenVersion == u.getTokenVersion())
                    .ifPresentOrElse(user -> {
                        UsernamePasswordAuthenticationToken auth =
                                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
                        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContext ctx = SecurityContextHolder.createEmptyContext();
                        ctx.setAuthentication(auth);
                        SecurityContextHolder.setContext(ctx);
                    }, () -> request.setAttribute(ATTR_AUTH_ERROR, "TOKEN_REVOKED"));

        } catch (ExpiredJwtException e) {
            request.setAttribute(ATTR_AUTH_ERROR, "TOKEN_EXPIRED");
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Rejected JWT: {}", e.getMessage());
            request.setAttribute(ATTR_AUTH_ERROR, "TOKEN_INVALID");
        }

        chain.doFilter(request, response);
    }
}
