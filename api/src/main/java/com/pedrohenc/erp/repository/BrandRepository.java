package com.pedrohenc.erp.repository;


import com.pedrohenc.erp.entity.TbBrand;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BrandRepository extends JpaRepository<TbBrand, Long> {
}
