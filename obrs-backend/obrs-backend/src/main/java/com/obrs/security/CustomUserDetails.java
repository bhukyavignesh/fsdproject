package com.obrs.security;

import com.obrs.model.Role;
import com.obrs.model.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

/**
 * Authenticated principal stored in the SecurityContext. Immutable snapshot of
 * the user; never exposes the password hash outside authentication.
 */
public final class CustomUserDetails implements UserDetails {

    private final Long id;
    private final String email;
    private final String passwordHash;
    private final Role role;
    private final Long operatorId;
    private final boolean enabled;
    private final boolean locked;
    private final int tokenVersion;

    public CustomUserDetails(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.passwordHash = user.getPasswordHash();
        this.role = user.getRole();
        this.operatorId = user.getOperator() == null ? null : user.getOperator().getId();
        this.enabled = user.isEnabled();
        this.locked = user.isLocked(Instant.now());
        this.tokenVersion = user.getTokenVersion();
    }

    public Long getId() { return id; }
    public Role getRole() { return role; }
    /** Operator company this user manages (OPERATOR role only), else null. */
    public Long getOperatorId() { return operatorId; }
    public int getTokenVersion() { return tokenVersion; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override public String getPassword() { return passwordHash; }
    @Override public String getUsername() { return email; }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return !locked; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return enabled; }
}
