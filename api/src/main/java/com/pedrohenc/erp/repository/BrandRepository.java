package com.pedrohenc.erp.repository;


import com.pedrohenc.erp.entity.TbBrand;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BrandRepository extends JpaRepository<TbBrand, Long> {

    List<TbBrand> findByActiveTrueOrderByNameAsc();
}
