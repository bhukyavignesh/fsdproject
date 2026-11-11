package com.obrs.service;

import com.obrs.config.AppProperties;
import com.obrs.dto.auth.*;
import com.obrs.exception.ApiException;
import com.obrs.exception.ErrorCode;
import com.obrs.model.RefreshToken;
import com.obrs.model.Role;
import com.obrs.model.User;
import com.obrs.repository.RefreshTokenRepository;
import com.obrs.repository.UserRepository;
import com.obrs.security.JwtService;
import com.obrs.security.TokenHasher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Registration, login, token refresh/rotation, logout and password change.
 *
 * Security measures:
 * <ul>
 *   <li>BCrypt(12) password hashes; strong-password policy enforced by DTO validation.</li>
 *   <li>Generic "invalid credentials" message; a dummy hash check when the user does not
 *       exist keeps response time constant (no user enumeration via timing).</li>
 *   <li>Account lockout after N failed attempts.</li>
 *   <li>Refresh tokens: random, hashed at rest, single-use with rotation; replaying a
 *       used token revokes every session for that user (theft detection).</li>
 *   <li>token_version claim lets us invalidate all access tokens instantly.</li>
 * </ul>
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final Clock clock;
    private final int maxFailedLogins;
    private final Duration lockoutDuration;
    private final Duration refreshTtl;
    private final String dummyHash;

    public AuthService(UserRepository userRepository, RefreshTokenRepository refreshTokenRepository,
                       PasswordEncoder passwordEncoder, JwtService jwtService, AppProperties props, Clock clock) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.clock = clock;
        this.maxFailedLogins = props.security().maxFailedLogins();
        this.lockoutDuration = props.security().lockoutDuration();
        this.refreshTtl = props.jwt().refreshTokenTtl();
        this.dummyHash = passwordEncoder.encode("timing-equaliser-" + TokenHasher.newToken());
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = normaliseEmail(req.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ApiException(ErrorCode.EMAIL_ALREADY_REGISTERED, "An account with this email already exists");
        }
        if (userRepository.existsByPhone(req.phone())) {
            throw new ApiException(ErrorCode.PHONE_ALREADY_REGISTERED, "An account with this phone number already exists");
        }
        // Role is never taken from the request: self-registration is always PASSENGER.
        User user = new User(req.name().trim(), email, req.phone(), passwordEncoder.encode(req.password()), Role.PASSENGER);
        userRepository.save(user);
        log.info("Registered user {}", user.getId());
        return issueTokens(user);
    }

    /** noRollbackFor: failed-attempt counters must be committed even though we throw. */
    @Transactional(noRollbackFor = ApiException.class)
    public AuthResponse login(LoginRequest req) {
        Instant now = clock.instant();
        Optional<User> found = findByIdentifier(req.identifier());

        if (found.isEmpty()) {
            passwordEncoder.matches(req.password(), dummyHash); // constant-time-ish response
            throw invalidCredentials();
        }
        User user = found.get();

        if (user.isLocked(now)) {
            long seconds = Math.max(1, Duration.between(now, user.getLockedUntil()).toSeconds());
            throw new ApiException(ErrorCode.ACCOUNT_LOCKED,
                    "Too many failed attempts. Try again in " + ((seconds + 59) / 60) + " minute(s).",
                    Map.of("retryAfterSeconds", seconds));
        }
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            user.registerFailedLogin(maxFailedLogins, now.plus(lockoutDuration));
            log.warn("Failed login for user {} (attempts={})", user.getId(), user.getFailedLoginAttempts());
            throw invalidCredentials();
        }
        if (!user.isEnabled()) {
            throw new ApiException(ErrorCode.ACCOUNT_DISABLED, "This account has been disabled. Contact support.");
        }
        user.resetFailedLogins();
        log.info("User {} logged in", user.getId());
        return issueTokens(user);
    }

    /** Rotates the refresh token: the presented token is revoked and a new pair is issued. */
    @Transactional(noRollbackFor = ApiException.class)
    public AuthResponse refresh(RefreshRequest req) {
        Instant now = clock.instant();
        RefreshToken token = refreshTokenRepository.findByTokenHash(TokenHasher.sha256(req.refreshToken()))
                .orElseThrow(this::invalidRefresh);
        User user = token.getUser();

        if (token.isRevoked()) {
            // A token we already rotated is being replayed => assume it was stolen.
            log.warn("Refresh token reuse detected for user {}; revoking all sessions", user.getId());
            refreshTokenRepository.revokeAllForUser(user.getId());
            user.bumpTokenVersion();
            throw invalidRefresh();
        }
        if (!token.isUsable(now) || !user.isEnabled() || user.isLocked(now)) {
            token.revoke();
            throw invalidRefresh();
        }
        token.revoke();
        return issueTokens(user);
    }

    /** Revokes one refresh token (this device). The short-lived access token simply expires. */
    @Transactional
    public void logout(Long userId, String refreshToken) {
        refreshTokenRepository.findByTokenHash(TokenHasher.sha256(refreshToken))
                .filter(t -> t.getUser().getId().equals(userId))
                .ifPresent(RefreshToken::revoke);
    }

    /** Signs out everywhere: revokes refresh tokens and invalidates outstanding access tokens. */
    @Transactional
    public void logoutAll(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        refreshTokenRepository.revokeAllForUser(userId);
        user.bumpTokenVersion();
    }

    @Transactional
    public AuthResponse changePassword(Long userId, ChangePasswordRequest req) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS, "Current password is incorrect");
        }
        if (passwordEncoder.matches(req.newPassword(), user.getPasswordHash())) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "New password must differ from the current one");
        }
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        refreshTokenRepository.revokeAllForUser(userId);
        user.bumpTokenVersion();
        return issueTokens(user); // keep the caller signed in with fresh tokens
    }

    @Transactional(readOnly = true)
    public UserResponse me(Long userId) {
        return userRepository.findById(userId).map(UserResponse::from).orElseThrow(() -> ApiException.notFound("User"));
    }

    private AuthResponse issueTokens(User user) {
        String rawRefresh = TokenHasher.newToken();
        refreshTokenRepository.save(new RefreshToken(user, TokenHasher.sha256(rawRefresh), clock.instant().plus(refreshTtl)));
        String access = jwtService.generateAccessToken(user);
        return AuthResponse.bearer(access, jwtService.getAccessTokenTtlSeconds(), rawRefresh, UserResponse.from(user));
    }

    private Optional<User> findByIdentifier(String identifier) {
        String id = identifier.trim();
        return id.contains("@") ? userRepository.findByEmailIgnoreCase(normaliseEmail(id)) : userRepository.findByPhone(id);
    }

    private static String normaliseEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private ApiException invalidCredentials() {
        return new ApiException(ErrorCode.INVALID_CREDENTIALS, "Invalid email/phone or password");
    }

    private ApiException invalidRefresh() {
        return new ApiException(ErrorCode.INVALID_REFRESH_TOKEN, "Session expired. Please log in again.");
    }
}
