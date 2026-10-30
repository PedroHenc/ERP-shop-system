package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.dto.stock.StockMovementPageRequest;
import com.pedrohenc.erp.dto.stock.StockMovementPageResponse;
import com.pedrohenc.erp.dto.stock.StockMovementRequest;
import com.pedrohenc.erp.dto.stock.StockMovementResponse;
import com.pedrohenc.erp.security.Roles;
import com.pedrohenc.erp.service.StockMovementService;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class StockMovementController {

    private final StockMovementService stockMovementService;

    @PreAuthorize(Roles.STOCK_MOVE)
    @PostMapping("/products/{id}/stock-movements")
    @ResponseStatus(HttpStatus.CREATED)
    public StockMovementResponse record(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                        @Valid @RequestBody StockMovementRequest request) {
        return stockMovementService.record(Long.parseLong(jwt.getSubject()), id, request);
    }

    /** Every movement of the store, newest first; `productId` narrows it to one product's history. */
    @PreAuthorize(Roles.STOCK_MOVE)
    @GetMapping("/stock-movements/page")
    public StockMovementPageResponse findPage(@Valid @ModelAttribute StockMovementPageRequest request) {
        return stockMovementService.findPage(request);
    }
}
