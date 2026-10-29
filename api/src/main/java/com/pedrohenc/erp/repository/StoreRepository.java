package com.pedrohenc.erp.repository;

import com.pedrohenc.erp.entity.TbStore;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoreRepository extends JpaRepository<TbStore, Long> {
}
