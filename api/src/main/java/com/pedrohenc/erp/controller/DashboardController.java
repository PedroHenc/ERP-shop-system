package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.dto.dashboard.DashboardSummaryResponse;
import com.pedrohenc.erp.security.Roles;
import com.pedrohenc.erp.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @PreAuthorize(Roles.ANY)
    @GetMapping("/summary")
    public DashboardSummaryResponse summary(Authentication authentication) {
        boolean includeSuppliers = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(Roles.SUPPLIER_READ_AUTHORITIES::contains);

        return dashboardService.summary(includeSuppliers);
    }
}
