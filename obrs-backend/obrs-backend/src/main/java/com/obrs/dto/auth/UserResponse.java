package com.obrs.dto.auth;

import com.obrs.model.User;

import java.time.Instant;

public record UserResponse(Long id, String name, String email, String phone, String role, Long operatorId, Instant createdAt) {
    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getName(), u.getEmail(), u.getPhone(), u.getRole().name(),
                u.getOperator() == null ? null : u.getOperator().getId(), u.getCreatedAt());
    }
}
