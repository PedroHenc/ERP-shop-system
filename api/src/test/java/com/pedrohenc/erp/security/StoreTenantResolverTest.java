package com.pedrohenc.erp.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

class StoreTenantResolverTest {

    private final StoreTenantResolver resolver = new StoreTenantResolver();

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private static void authenticate(Jwt.Builder jwt) {
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt.build()));
    }

    private static Jwt.Builder jwt() {
        return Jwt.withTokenValue("token").header("alg", "HS256").subject("ana@shop.com");
    }

    @Test
    void resolvesStoreFromJwtClaim() {
        authenticate(jwt().claim("store", 7));

        assertThat(resolver.resolveCurrentTenantIdentifier()).isEqualTo(7L);
    }

    @Test
    void jwtWithoutStoreClaimIsRejected() {
        authenticate(jwt());

        assertThrows(InvalidBearerTokenException.class, resolver::resolveCurrentTenantIdentifier);
    }

    @Test
    void noAuthenticationIsRoot() {
        assertThat(resolver.resolveCurrentTenantIdentifier()).isEqualTo(0L);
        assertThat(resolver.isRoot(0L)).isTrue();
        assertThat(resolver.isRoot(7L)).isFalse();
    }

    @Test
    void anonymousAuthenticationIsRoot() {
        SecurityContextHolder.getContext().setAuthentication(new AnonymousAuthenticationToken(
                "key", "anonymousUser", AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS")));

        assertThat(resolver.resolveCurrentTenantIdentifier()).isEqualTo(0L);
    }

    @Test
    void nonJwtAuthenticationIsRejected() {
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                "ana@shop.com", null, AuthorityUtils.createAuthorityList("ROLE_ADMIN")));

        assertThrows(InvalidBearerTokenException.class, resolver::resolveCurrentTenantIdentifier);
    }
}
