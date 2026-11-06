package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.dto.purchase.PurchaseOrderPageRequest;
import com.pedrohenc.erp.dto.purchase.PurchaseOrderPageResponse;
import com.pedrohenc.erp.dto.purchase.PurchaseOrderReceiveRequest;
import com.pedrohenc.erp.dto.purchase.PurchaseOrderRequest;
import com.pedrohenc.erp.dto.purchase.PurchaseOrderResponse;
import com.pedrohenc.erp.dto.purchase.ReorderSuggestion;
import com.pedrohenc.erp.security.Roles;
import com.pedrohenc.erp.service.PurchaseOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/purchase-orders")
public class PurchaseOrderController {

    private final PurchaseOrderService service;

    @PreAuthorize(Roles.PURCHASE_READ)
    @GetMapping("/page")
    public PurchaseOrderPageResponse findPage(@Valid @ModelAttribute PurchaseOrderPageRequest request) {
        return service.findPage(request);
    }

    @PreAuthorize(Roles.PURCHASE_READ)
    @GetMapping("/suggestions")
    public List<ReorderSuggestion> suggestions() {
        return service.suggestions();
    }

    @PreAuthorize(Roles.PURCHASE_READ)
    @GetMapping("/{id}")
    public PurchaseOrderResponse findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PreAuthorize(Roles.PURCHASE_WRITE)
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PurchaseOrderResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PurchaseOrderRequest request) {
        return service.create(Long.parseLong(jwt.getSubject()), request);
    }

    @PreAuthorize(Roles.PURCHASE_WRITE)
    @PutMapping("/{id}")
    public PurchaseOrderResponse update(@PathVariable Long id, @Valid @RequestBody PurchaseOrderRequest request) {
        return service.update(id, request);
    }

    @PreAuthorize(Roles.PURCHASE_WRITE)
    @PostMapping("/{id}/send")
    public PurchaseOrderResponse send(@PathVariable Long id) {
        return service.send(id);
    }

    @PreAuthorize(Roles.PURCHASE_WRITE)
    @PostMapping("/{id}/cancel")
    public PurchaseOrderResponse cancel(@PathVariable Long id) {
        return service.cancel(id);
    }

    /** The stock team receives too: they check what arrives. */
    @PreAuthorize(Roles.PURCHASE_READ)
    @PostMapping("/{id}/receive")
    public PurchaseOrderResponse receive(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                         @Valid @RequestBody PurchaseOrderReceiveRequest request) {
        return service.receive(Long.parseLong(jwt.getSubject()), id, request);
    }
}
