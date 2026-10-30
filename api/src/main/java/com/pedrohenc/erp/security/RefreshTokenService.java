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

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

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
                .storeId(user.getStoreId())
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
     *   <li>Revoked by rotation up to 30 s ago and grace not used yet: accepted ONCE more (a new token is
     *       issued, {@code graceUsedAt} is set, nothing else is revoked).</li>
     *   <li>Revoked by rotation more than 30 s ago, or grace already used: treated as theft, every session of
     *       the user is revoked.</li>
     *   <li>Revoked by logout or by an admin (including a rotated token whose grace was ended by a later
     *       revocation, see {@link #endRotationGrace}): rejected, no grace.</li>
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
            boolean rotated = token.getRevokedReason() == RevokedReason.ROTATED;
            boolean withinGrace = rotated
                    && token.getGraceUsedAt() == null
                    && !now.isAfter(token.getRevokedAt().plus(ROTATION_GRACE));
            if (!withinGrace) {
                if (rotated) {
                    log.warn("Reuse of a rotated refresh token for user {}; revoking all sessions", user.getId());
                    revokeFamily(user.getId(), now);
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
        } else {
            token.setGraceUsedAt(now);
        }
        return new RotationResult(user, issue(user));
    }

    /**
     * Logout: revokes the token if it is still active, and ends the grace of the user's recently
     * rotated tokens so a predecessor of this session cannot revive it. Unknown tokens are ignored.
     */
    @Transactional
    public void revoke(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        repository.findByTokenHash(hash(rawToken)).ifPresent(token -> {
            Instant now = clock.instant();
            if (token.getRevokedAt() == null) {
                token.setRevokedAt(now);
                token.setRevokedReason(RevokedReason.LOGOUT);
            }
            endRotationGrace(token.getUser().getId(), now);
        });
    }

    @Transactional
    public void revokeAll(Long userId) {
        revokeFamily(userId, clock.instant());
    }

    /**
     * Revokes every active token of the user except {@code keepRawToken} (with no token, revokes all),
     * and ends the grace of the user's recently rotated tokens.
     */
    @Transactional
    public void revokeAllExcept(Long userId, String keepRawToken) {
        if (keepRawToken == null || keepRawToken.isBlank()) {
            revokeAll(userId);
            return;
        }
        Instant now = clock.instant();
        repository.revokeAllActiveByUserIdExceptHash(userId, hash(keepRawToken), now);
        endRotationGrace(userId, now);
    }

    private void revokeFamily(Long userId, Instant now) {
        repository.revokeAllActiveByUserId(userId, now);
        endRotationGrace(userId, now);
    }

    /**
     * Bulk revocation only touches tokens with {@code revokedAt == null}. Without this, a token rotated
     * less than 30 s ago would keep its grace and could mint a new session after its successor was revoked.
     */
    private void endRotationGrace(Long userId, Instant now) {
        repository.revokeRecentlyRotatedByUserId(userId, now.minus(ROTATION_GRACE));
    }

    static String hash(String raw) {
        return TokenHashes.sha256Hex(raw);
    }

    public record RotationResult(TbUser user, String newRawToken) {
    }
}
