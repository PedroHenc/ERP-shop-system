package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.dto.StatusRequest;
import com.pedrohenc.erp.dto.supplier.SupplierPageRequest;
import com.pedrohenc.erp.dto.supplier.SupplierPageResponse;
import com.pedrohenc.erp.dto.supplier.SupplierRequest;
import com.pedrohenc.erp.dto.supplier.SupplierResponse;
import com.pedrohenc.erp.service.SupplierService;
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

@RestController
@RequestMapping("/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService supplierService;

    @PreAuthorize(Roles.SUPPLIER_READ)
    @GetMapping("/page")
    public SupplierPageResponse findPage(@Valid @ModelAttribute SupplierPageRequest request) {
        return supplierService.findPage(request);
    }

    @PreAuthorize(Roles.SUPPLIER_READ)
    @GetMapping("/{id}")
    public SupplierResponse findById(@PathVariable Long id) {
        return supplierService.findById(id);
    }

    @PreAuthorize(Roles.SUPPLIER_WRITE)
    @PostMapping
    public ResponseEntity<SupplierResponse> create(@Valid @RequestBody SupplierRequest request) {
        SupplierResponse supplier = supplierService.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(supplier.id())
                .toUri();

        return ResponseEntity.created(location).body(supplier);
    }

    @PreAuthorize(Roles.SUPPLIER_WRITE)
    @PutMapping("/{id}")
    public SupplierResponse update(@PathVariable Long id, @Valid @RequestBody SupplierRequest request) {
        return supplierService.update(id, request);
    }

    @PreAuthorize(Roles.SUPPLIER_WRITE)
    @PatchMapping("/{id}/status")
    public SupplierResponse setStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest request) {
        return supplierService.setStatus(id, request.active());
    }
}
