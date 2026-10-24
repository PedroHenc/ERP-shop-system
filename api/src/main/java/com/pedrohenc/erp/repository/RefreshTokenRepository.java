package com.pedrohenc.erp.repository;

import com.pedrohenc.erp.entity.RevokedReason;
import com.pedrohenc.erp.entity.TbRefreshToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<TbRefreshToken, Long> {

    /**
     * Locks the row (SELECT ... FOR UPDATE) so two concurrent refreshes of the same token are
     * serialized: the second one sees the rotation made by the first. Must run inside a transaction.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<TbRefreshToken> findByTokenHash(String tokenHash);

    /** Revokes (reason {@code REVOKED}) every token of the user whose {@code revokedAt} is still null. */
    default int revokeAllActiveByUserId(Long userId, Instant now) {
        return revokeActive(userId, now, RevokedReason.REVOKED);
    }

    /** Same as {@link #revokeAllActiveByUserId}, but keeps the token with the given hash. */
    default int revokeAllActiveByUserIdExceptHash(Long userId, String keepHash, Instant now) {
        return revokeActiveExceptHash(userId, keepHash, now, RevokedReason.REVOKED);
    }

    /**
     * Ends the reuse grace of the user's tokens rotated at or after {@code since}: they become
     * {@code REVOKED} (keeping their {@code revokedAt}), so they can no longer mint a session.
     */
    default int revokeRecentlyRotatedByUserId(Long userId, Instant since) {
        return changeReasonSince(userId, since, RevokedReason.ROTATED, RevokedReason.REVOKED);
    }

    @Modifying(flushAutomatically = true)
    @Query("""
            update TbRefreshToken t set t.revokedReason = :to
            where t.user.id = :userId and t.revokedReason = :from and t.revokedAt >= :since""")
    int changeReasonSince(@Param("userId") Long userId, @Param("since") Instant since,
                          @Param("from") RevokedReason from, @Param("to") RevokedReason to);

    @Modifying(flushAutomatically = true)
    @Query("""
            update TbRefreshToken t set t.revokedAt = :now, t.revokedReason = :reason
            where t.user.id = :userId and t.revokedAt is null""")
    int revokeActive(@Param("userId") Long userId, @Param("now") Instant now,
                     @Param("reason") RevokedReason reason);

    @Modifying(flushAutomatically = true)
    @Query("""
            update TbRefreshToken t set t.revokedAt = :now, t.revokedReason = :reason
            where t.user.id = :userId and t.revokedAt is null and t.tokenHash <> :keepHash""")
    int revokeActiveExceptHash(@Param("userId") Long userId, @Param("keepHash") String keepHash,
                               @Param("now") Instant now, @Param("reason") RevokedReason reason);
}
