package com.pedrohenc.erp.repository;

import com.pedrohenc.erp.entity.TbScanSession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface ScanSessionRepository extends JpaRepository<TbScanSession, Long> {

    /** Called anonymously (root tenant): the token alone finds the session, in any store. */
    Optional<TbScanSession> findByTokenHash(String tokenHash);

    /** Locks the session so two phones cannot both fill it. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from TbScanSession s where s.tokenHash = :tokenHash")
    Optional<TbScanSession> findForUpdateByTokenHash(String tokenHash);
}
