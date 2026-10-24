package com.pedrohenc.erp.security;

import com.pedrohenc.erp.config.JwtProperties;
import com.pedrohenc.erp.entity.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SECRET = "unit-test-secret-unit-test-secret-unit-test-secret";

    // Recent enough for the decoder's expiry check, fixed so the issued-at can be asserted exactly.
    private final Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS).minusSeconds(60);
    private final JwtConfig config = new JwtConfig();
    private final JwtProperties properties = new JwtProperties(SECRET, Duration.ofMinutes(15));
    private final JwtService service =
            new JwtService(config.jwtEncoder(properties), properties, Clock.fixed(now, ZoneOffset.UTC));

    @Test
    void issuedTokenIsAcceptedByDecoderWithExpectedClaims() {
        JwtService.IssuedToken issued = service.issueAccessToken(7L, "a@b.com", UserRole.MANAGER);

        Jwt jwt = config.jwtDecoder(properties).decode(issued.token());

        assertThat(jwt.getSubject()).isEqualTo("7");
        assertThat(jwt.<String>getClaim("email")).isEqualTo("a@b.com");
        assertThat(jwt.<String>getClaim("role")).isEqualTo("MANAGER");
        assertThat(Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt()).getSeconds()).isEqualTo(900);
        assertThat(issued.expiresIn()).isEqualTo(900);
    }

    @Test
    void usesTheInjectedClockForIssuedAtAndExpiry() {
        String token = service.issueAccessToken(7L, "a@b.com", UserRole.MANAGER).token();

        Jwt jwt = config.jwtDecoder(properties).decode(token);

        assertThat(jwt.getIssuedAt()).isEqualTo(now);
        assertThat(jwt.getExpiresAt()).isEqualTo(now.plus(Duration.ofMinutes(15)));
    }

    @Test
    void tokenSignedWithAnotherSecretIsRejected() {
        JwtProperties other = new JwtProperties("another-secret-another-secret-another-secret!!", Duration.ofMinutes(15));
        JwtDecoder otherDecoder = config.jwtDecoder(other);

        String token = service.issueAccessToken(7L, "a@b.com", UserRole.ADMIN).token();

        assertThatThrownBy(() -> otherDecoder.decode(token)).isInstanceOf(JwtException.class);
    }
}
