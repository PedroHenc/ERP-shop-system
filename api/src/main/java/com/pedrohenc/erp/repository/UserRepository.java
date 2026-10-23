package com.pedrohenc.erp.repository;

import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface UserRepository extends JpaRepository<TbUser, Long>, JpaSpecificationExecutor<TbUser> {

    Optional<TbUser> findByEmail(String normalizedEmail);

    boolean existsByEmail(String normalizedEmail);

    boolean existsByEmailAndIdNot(String normalizedEmail, Long id);

    long countByRoleAndActiveTrue(UserRole role);

    /*
     * Login bookkeeping. These are JPQL bulk updates on purpose: they do not increment @Version
     * nor touch the audit columns, so logins never cause 409s on concurrent logins or on an
     * admin's edit, and the counter increment is atomic in the database.
     */

    @Modifying
    @Query("update TbUser u set u.failedAttempts = u.failedAttempts + 1 where u.id = :id")
    int incrementFailedAttempts(@Param("id") Long id);

    /** Locks the account and resets the counter once it has reached {@code maxAttempts}. */
    @Modifying
    @Query("""
            update TbUser u set u.lockedUntil = :lockedUntil, u.failedAttempts = 0
            where u.id = :id and u.failedAttempts >= :maxAttempts""")
    int lockIfFailedAttemptsReached(@Param("id") Long id, @Param("maxAttempts") int maxAttempts,
                                    @Param("lockedUntil") Instant lockedUntil);

    @Modifying
    @Query("""
            update TbUser u set u.failedAttempts = 0, u.lockedUntil = null, u.lastLoginAt = :now
            where u.id = :id""")
    int recordSuccessfulLogin(@Param("id") Long id, @Param("now") Instant now);
}
