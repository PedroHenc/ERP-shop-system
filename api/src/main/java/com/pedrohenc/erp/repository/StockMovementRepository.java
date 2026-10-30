package com.pedrohenc.erp.repository;

import com.pedrohenc.erp.entity.TbStockMovement;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

public interface StockMovementRepository extends JpaRepository<TbStockMovement, Long>, JpaSpecificationExecutor<TbStockMovement> {

    /** Lists show the product and the author of each movement: fetch them with the page. */
    @Override
    @EntityGraph(attributePaths = {"product", "createdBy"})
    Page<TbStockMovement> findAll(Specification<TbStockMovement> spec, Pageable pageable);
}
