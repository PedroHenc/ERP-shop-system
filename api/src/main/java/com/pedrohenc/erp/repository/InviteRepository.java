package com.pedrohenc.erp.repository;

import com.pedrohenc.erp.entity.TbInvite;
import com.pedrohenc.erp.entity.TbUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface InviteRepository extends JpaRepository<TbInvite, Long> {

    /** Runs anonymously (root tenant) when someone presents a code, so it finds the invite in any store. */
    Optional<TbInvite> findByTokenHash(String tokenHash);

    /** Pending invites of the current store, newest first. */
    @Query("""
            select i from TbInvite i join fetch i.createdBy
            where i.usedAt is null and i.revokedAt is null and i.expiresAt > :now
            order by i.createdAt desc, i.id desc""")
    List<TbInvite> findPending(@Param("now") Instant now);

    /**
     * Marks the invite used only if it still is pending; returns 0 when another request took it first,
     * so two people can never join with the same code.
     */
    @Modifying
    @Query("""
            update TbInvite i set i.usedAt = :now, i.usedBy = :user
            where i.id = :id and i.usedAt is null and i.revokedAt is null and i.expiresAt > :now""")
    int markUsed(@Param("id") Long id, @Param("user") TbUser user, @Param("now") Instant now);
}
