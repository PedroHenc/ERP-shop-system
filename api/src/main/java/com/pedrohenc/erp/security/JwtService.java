package com.pedrohenc.erp.security;

import com.pedrohenc.erp.config.JwtProperties;
import com.pedrohenc.erp.entity.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtEncoder encoder;
    private final JwtProperties properties;
    private final Clock clock;

    public IssuedToken issueAccessToken(long userId, String email, UserRole role, long storeId) {
        Instant now = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(String.valueOf(userId))
                .issuedAt(now)
                .expiresAt(now.plus(properties.accessTtl()))
                .claim("email", email)
                .claim("role", role.name())
                .claim(StoreTenantResolver.STORE_CLAIM, storeId)
                .build();
        String token = encoder.encode(
                JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new IssuedToken(token, properties.accessTtl().toSeconds());
    }

    public record IssuedToken(String token, long expiresIn) {
    }
}