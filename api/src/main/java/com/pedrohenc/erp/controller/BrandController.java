package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.dto.brand.BrandResponse;
import com.pedrohenc.erp.service.BrandService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/brands")
@RequiredArgsConstructor
public class BrandController {

    private final BrandService brandService;

    @GetMapping
    public List<BrandResponse> findActive() {
        return brandService.findActive();
    }
}
