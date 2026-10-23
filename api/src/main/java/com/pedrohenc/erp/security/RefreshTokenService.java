package com.pedrohenc.erp.security;

import com.pedrohenc.erp.config.AuthProperties;
import com.pedrohenc.erp.entity.RevokedReason;
import com.pedrohenc.erp.entity.TbRefreshToken;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.exception.InvalidCredentialsException;
import com.pedrohenc.erp.repository.RefreshTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class RefreshTokenService {

    /** A token revoked by rotation may be reused for this long (concurrent tabs/requests). */
    static final Duration ROTATION_GRACE = Duration.ofSeconds(30);

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);
    private static final int TOKEN_BYTES = 32;

    private final RefreshTokenRepository repository;
    private final AuthProperties properties;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository repository, AuthProperties properties, Clock clock) {
        this.repository = repository;
        this.properties = properties;
        this.clock = clock;
    }

    /** Creates and stores a new refresh token for the user; returns the raw value (only its hash is stored). */
    @Transactional
    public String issue(TbUser user) {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant now = clock.instant();
        repository.save(TbRefreshToken.builder()
                .user(user)
                .tokenHash(hash(raw))
                .createdAt(now)
                .expiresAt(now.plus(properties.refreshTtl()))
                .build());
        return raw;
    }

    /**
     * Validates the token and replaces it with a new one.
     * <ul>
     *   <li>Unknown, expired or inactive user's token: rejected.</li>
     *   <li>Revoked by rotation up to 30 s ago: accepted again (a new token is issued, nothing else is revoked).</li>
     *   <li>Revoked by rotation more than 30 s ago: treated as theft, every session of the user is revoked.</li>
     *   <li>Revoked by logout or by an admin: rejected, no grace.</li>
     * </ul>
     * {@code noRollbackFor} keeps the family revocation when the reuse is rejected.
     */
    @Transactional(noRollbackFor = InvalidCredentialsException.class)
    public RotationResult rotate(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new InvalidCredentialsException();
        }
        TbRefreshToken token = repository.findByTokenHash(hash(rawToken))
                .orElseThrow(InvalidCredentialsException::new);
        TbUser user = token.getUser();
        Instant now = clock.instant();

        if (token.getRevokedAt() != null) {
            boolean withinGrace = token.getRevokedReason() == RevokedReason.ROTATED
                    && !now.isAfter(token.getRevokedAt().plus(ROTATION_GRACE));
            if (!withinGrace) {
                if (token.getRevokedReason() == RevokedReason.ROTATED) {
                    log.warn("Reuse of a rotated refresh token for user {}; revoking all sessions", user.getId());
                    repository.revokeAllActiveByUserId(user.getId(), now);
                }
                throw new InvalidCredentialsException();
            }
        }

        if (!now.isBefore(token.getExpiresAt()) || !Boolean.TRUE.equals(user.getActive())) {
            throw new InvalidCredentialsException();
        }

        if (token.getRevokedAt() == null) {
            token.setRevokedAt(now);
            token.setRevokedReason(RevokedReason.ROTATED);
        }
        return new RotationResult(user, issue(user));
    }

    /** Logout: revokes the token if it exists and is still active. Unknown tokens are ignored. */
    @Transactional
    public void revoke(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        repository.findByTokenHash(hash(rawToken)).ifPresent(token -> {
            if (token.getRevokedAt() == null) {
                token.setRevokedAt(clock.instant());
                token.setRevokedReason(RevokedReason.LOGOUT);
            }
        });
    }

    @Transactional
    public void revokeAll(Long userId) {
        repository.revokeAllActiveByUserId(userId, clock.instant());
    }

    /** Revokes every active token of the user except {@code keepRawToken}; with no token, revokes all. */
    @Transactional
    public void revokeAllExcept(Long userId, String keepRawToken) {
        if (keepRawToken == null || keepRawToken.isBlank()) {
            revokeAll(userId);
            return;
        }
        repository.revokeAllActiveByUserIdExceptHash(userId, hash(keepRawToken), clock.instant());
    }

    static String hash(String raw) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    public record RotationResult(TbUser user, String newRawToken) {
    }
}
