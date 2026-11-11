package com.obrs.service;

import com.obrs.dto.admin.*;
import com.obrs.exception.ApiException;
import com.obrs.exception.ErrorCode;
import com.obrs.model.Operator;
import com.obrs.model.Role;
import com.obrs.model.Route;
import com.obrs.model.User;
import com.obrs.repository.OperatorRepository;
import com.obrs.repository.RefreshTokenRepository;
import com.obrs.repository.RouteRepository;
import com.obrs.repository.UserRepository;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

/** Platform administration: routes, operator onboarding, account status. */
@Service
public class AdminService {

    private final RouteRepository routeRepository;
    private final OperatorRepository operatorRepository;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminService(RouteRepository routeRepository, OperatorRepository operatorRepository, UserRepository userRepository,
                        RefreshTokenRepository refreshTokenRepository, PasswordEncoder passwordEncoder) {
        this.routeRepository = routeRepository;
        this.operatorRepository = operatorRepository;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public RouteResponse createRoute(CreateRouteRequest req) {
        String source = titleCase(req.sourceCity());
        String destination = titleCase(req.destinationCity());
        if (source.equalsIgnoreCase(destination)) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Source and destination must differ");
        }
        if (routeRepository.findBySourceCityIgnoreCaseAndDestinationCityIgnoreCase(source, destination).isPresent()) {
            throw new ApiException(ErrorCode.DUPLICATE_RESOURCE, "Route already exists");
        }
        return RouteResponse.from(routeRepository.save(new Route(source, destination, req.distanceKm(), req.estimatedDurationMinutes())));
    }

    @Transactional
    public OperatorResponse createOperator(CreateOperatorRequest req) {
        if (operatorRepository.existsByNameIgnoreCase(req.name().trim())) {
            throw new ApiException(ErrorCode.DUPLICATE_RESOURCE, "Operator name already exists");
        }
        var acc = req.account();
        String email = acc.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ApiException(ErrorCode.EMAIL_ALREADY_REGISTERED, "Account email already registered");
        }
        if (userRepository.existsByPhone(acc.phone())) {
            throw new ApiException(ErrorCode.PHONE_ALREADY_REGISTERED, "Account phone already registered");
        }
        Operator operator = operatorRepository.save(new Operator(req.name().trim(), req.contactEmail().trim().toLowerCase(Locale.ROOT), req.phone(), req.rating()));
        User user = new User(acc.name().trim(), email, acc.phone(), passwordEncoder.encode(acc.password()), Role.OPERATOR);
        user.setOperator(operator);
        userRepository.save(user);
        return OperatorResponse.from(operator);
    }

    @Transactional(readOnly = true)
    public List<OperatorResponse> listOperators() {
        return operatorRepository.findAll(Sort.by("name")).stream().map(OperatorResponse::from).toList();
    }

    /** Disabling a user also kills all their sessions immediately. */
    @Transactional
    public void setUserEnabled(Long adminId, Long userId, boolean enabled) {
        if (adminId.equals(userId)) {
            throw new ApiException(ErrorCode.BAD_REQUEST, "You cannot change your own account status");
        }
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        user.setEnabled(enabled);
        if (!enabled) {
            user.bumpTokenVersion();
            refreshTokenRepository.revokeAllForUser(userId);
        }
    }

    private static String titleCase(String s) {
        String t = s.trim().replaceAll("\\s+", " ");
        return t.isEmpty() ? t : Character.toUpperCase(t.charAt(0)) + t.substring(1);
    }
}
