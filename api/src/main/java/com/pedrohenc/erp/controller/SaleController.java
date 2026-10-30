package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.dto.sale.SaleCancelRequest;
import com.pedrohenc.erp.dto.sale.SalePageRequest;
import com.pedrohenc.erp.dto.sale.SalePageResponse;
import com.pedrohenc.erp.dto.sale.SaleRequest;
import com.pedrohenc.erp.dto.sale.SaleResponse;
import com.pedrohenc.erp.dto.sale.SalesSummaryRequest;
import com.pedrohenc.erp.dto.sale.SalesSummaryResponse;
import com.pedrohenc.erp.security.Roles;
import com.pedrohenc.erp.service.ReportService;
import com.pedrohenc.erp.service.SaleService;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/sales")
@RequiredArgsConstructor
public class SaleController {

    private final SaleService saleService;
    private final ReportService reportService;

    @PreAuthorize(Roles.SALES)
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SaleResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody SaleRequest request) {
        return saleService.create(actingUser(jwt), request);
    }

    @PreAuthorize(Roles.SALES)
    @GetMapping("/page")
    public SalePageResponse findPage(@Valid @ModelAttribute SalePageRequest request) {
        return saleService.findPage(request);
    }

    /** Totals of a period (today on the dashboard), for everyone who sells; the full report needs Roles.REPORTS. */
    @PreAuthorize(Roles.SALES)
    @GetMapping("/summary")
    public SalesSummaryResponse summary(@Valid @ModelAttribute SalesSummaryRequest request) {
        return reportService.salesSummary(request.from(), request.to());
    }

    @PreAuthorize(Roles.SALES)
    @GetMapping("/{id}")
    public SaleResponse findById(@PathVariable Long id) {
        return saleService.findById(id);
    }

    @PreAuthorize(Roles.SALES_CANCEL)
    @PostMapping("/{id}/cancel")
    public SaleResponse cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id, @Valid @RequestBody SaleCancelRequest request) {
        return saleService.cancel(actingUser(jwt), id, request);
    }

    private static long actingUser(Jwt jwt) {
        return Long.parseLong(jwt.getSubject());
    }
}
