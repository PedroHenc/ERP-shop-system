package com.pedrohenc.erp.repository;

import com.pedrohenc.erp.entity.TbSupplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface SupplierRepository extends JpaRepository<TbSupplier, Long>, JpaSpecificationExecutor<TbSupplier> {

    boolean existsByTaxId(String taxId);

    boolean existsByTaxIdAndIdNot(String taxId, Long id);

    long countByActiveTrue();
}
