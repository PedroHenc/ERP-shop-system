package com.pedrohenc.erp.service;

import com.pedrohenc.erp.dto.brand.BrandResponse;
import com.pedrohenc.erp.repository.BrandRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BrandService {

    private final BrandRepository brandRepository;

    @Transactional(readOnly = true)
    public List<BrandResponse> findActive() {
        return brandRepository.findByActiveTrueOrderByNameAsc().stream()
                .map(brand -> new BrandResponse(brand.getId(), brand.getName()))
                .toList();
    }
}
