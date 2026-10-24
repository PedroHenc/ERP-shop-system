package com.pedrohenc.erp.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.AuditorAware;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class JpaAuditingConfigTest {

    private final AuditorAware<String> auditorAware = new JpaAuditingConfig().auditorAware();

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private static Jwt jwt(String email) {
        Jwt.Builder builder = Jwt.withTokenValue("token")
                .header("alg", "HS256")
                .subject("1")
                .issuedAt(Instant.parse("2026-01-01T00:00:00Z"))
                .expiresAt(Instant.parse("2026-01-01T00:15:00Z"));
        if (email != null) {
            builder.claim("email", email);
        }
        return builder.build();
    }

    @Test
    void returnsTheEmailClaimOfAJwtAuthentication() {
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt("admin@shop.com")));

        assertThat(auditorAware.getCurrentAuditor()).contains("admin@shop.com");
    }

    @Test
    void isEmptyWhenTheJwtHasNoEmailClaim() {
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt(null)));

        assertThat(auditorAware.getCurrentAuditor()).isEmpty();
    }

    @Test
    void isEmptyWithoutAuthentication() {
        assertThat(auditorAware.getCurrentAuditor()).isEmpty();
    }

    @Test
    void isEmptyForAnotherAuthenticationType() {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated("admin@shop.com", null, List.of()));

        assertThat(auditorAware.getCurrentAuditor()).isEmpty();
    }
}
