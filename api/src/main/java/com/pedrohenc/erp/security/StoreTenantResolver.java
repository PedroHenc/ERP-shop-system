package com.pedrohenc.erp.security;

import org.hibernate.context.spi.CurrentTenantIdentifierResolver;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Picks the store (Hibernate tenant) of the current session from the {@code store} claim of the
 * authenticated JWT. Without a JWT (anonymous requests, startup, background work) the session runs
 * as {@link #ROOT}, which sees every store and keeps explicitly assigned store ids on insert.
 * Native queries bypass the tenant filter: they must restrict by {@code store_id} themselves.
 */
public class StoreTenantResolver implements CurrentTenantIdentifierResolver<Long> {

    public static final Long ROOT = 0L;

    static final String STORE_CLAIM = "store";

    @Override
    public Long resolveCurrentTenantIdentifier() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof JwtAuthenticationToken token)) {
            return ROOT;
        }
        Object store = token.getToken().getClaim(STORE_CLAIM);
        if (!(store instanceof Number number)) {
            throw new InvalidBearerTokenException("Token has no store claim");
        }
        return number.longValue();
    }

    @Override
    public boolean validateExistingCurrentSessions() {
        return true;
    }

    @Override
    public boolean isRoot(Long tenantId) {
        return ROOT.equals(tenantId);
    }
}
