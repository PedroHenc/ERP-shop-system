package com.pedrohenc.erp.repository;


import com.pedrohenc.erp.entity.TbBrand;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface BrandRepository extends JpaRepository<TbBrand, Long>, JpaSpecificationExecutor<TbBrand> {

    List<TbBrand> findByActiveTrueOrderByNameAsc();

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
