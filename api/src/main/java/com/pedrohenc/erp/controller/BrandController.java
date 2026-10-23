package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.dto.StatusRequest;
import com.pedrohenc.erp.dto.brand.BrandDetailResponse;
import com.pedrohenc.erp.dto.brand.BrandPageRequest;
import com.pedrohenc.erp.dto.brand.BrandPageResponse;
import com.pedrohenc.erp.dto.brand.BrandRequest;
import com.pedrohenc.erp.dto.brand.BrandResponse;
import com.pedrohenc.erp.service.BrandService;
import com.pedrohenc.erp.security.Roles;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/brands")
@RequiredArgsConstructor
public class BrandController {

    private final BrandService brandService;

    @PreAuthorize(Roles.ANY)
    @GetMapping
    public List<BrandResponse> findActive() {
        return brandService.findActive();
    }

    @PreAuthorize(Roles.ANY)
    @GetMapping("/page")
    public BrandPageResponse findPage(@Valid @ModelAttribute BrandPageRequest request) {
        return brandService.findPage(request);
    }

    @PreAuthorize(Roles.ANY)
    @GetMapping("/{id}")
    public BrandDetailResponse findById(@PathVariable Long id) {
        return brandService.findById(id);
    }

    @PreAuthorize(Roles.CATALOG_WRITE)
    @PostMapping
    public ResponseEntity<BrandDetailResponse> create(@Valid @RequestBody BrandRequest request) {
        BrandDetailResponse brand = brandService.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(brand.id())
                .toUri();

        return ResponseEntity.created(location).body(brand);
    }

    @PreAuthorize(Roles.CATALOG_WRITE)
    @PutMapping("/{id}")
    public BrandDetailResponse update(@PathVariable Long id, @Valid @RequestBody BrandRequest request) {
        return brandService.update(id, request);
    }

    @PreAuthorize(Roles.CATALOG_WRITE)
    @PatchMapping("/{id}/status")
    public BrandDetailResponse setStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest request) {
        return brandService.setStatus(id, request.active());
    }
}
