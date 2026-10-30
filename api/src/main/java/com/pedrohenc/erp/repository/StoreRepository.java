package com.pedrohenc.erp.repository;

import com.pedrohenc.erp.entity.TbStore;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface StoreRepository extends JpaRepository<TbStore, Long> {

    /** Locks the store's row: sales take it to hand out sequential numbers one at a time. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from TbStore s where s.id = :id")
    Optional<TbStore> findForUpdate(Long id);
}
