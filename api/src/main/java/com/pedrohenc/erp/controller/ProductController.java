package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.dto.product.ProductPageRequest;
import com.pedrohenc.erp.dto.product.ProductPageResponse;
import com.pedrohenc.erp.dto.product.ProductRequest;
import com.pedrohenc.erp.dto.product.ProductResponse;
import com.pedrohenc.erp.service.ProductService;
import com.pedrohenc.erp.security.Roles;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
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
@RequestMapping("/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @PreAuthorize(Roles.ANY)
    @GetMapping
    public List<ProductResponse> findAll() {
        return productService.findAll();
    }

    @PreAuthorize(Roles.ANY)
    @GetMapping("/page")
    public ProductPageResponse findPage(@Valid @ModelAttribute ProductPageRequest request) {
        return productService.findPage(request);
    }

    @PreAuthorize(Roles.ANY)
    @GetMapping("/{id}")
    public ProductResponse findById(@PathVariable Long id) {
        return productService.findById(id);
    }

    @PreAuthorize(Roles.CATALOG_WRITE)
    @PostMapping
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody ProductRequest request) {
        ProductResponse product = productService.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(product.id())
                .toUri();

        return ResponseEntity.created(location).body(product);
    }

    @PreAuthorize(Roles.CATALOG_WRITE)
    @PutMapping("/{id}")
    public ProductResponse update(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return productService.update(id, request);
    }

    @PreAuthorize(Roles.CATALOG_WRITE)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        productService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
