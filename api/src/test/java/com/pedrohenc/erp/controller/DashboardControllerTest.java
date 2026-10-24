package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.config.SecurityConfig;
import com.pedrohenc.erp.dto.dashboard.DashboardSummaryResponse;
import com.pedrohenc.erp.security.JwtConfig;
import com.pedrohenc.erp.security.ProblemDetailAuthHandlers;
import com.pedrohenc.erp.service.DashboardService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.math.BigDecimal;
import java.util.List;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DashboardController.class)
@Import({SecurityConfig.class, JwtConfig.class, ProblemDetailAuthHandlers.class})
class DashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DashboardService dashboardService;

    private static RequestPostProcessor asRole(String role) {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role));
    }

    private static DashboardSummaryResponse summary(Long suppliers) {
        return new DashboardSummaryResponse(10, 2, 1, new BigDecimal("150.50"), 4, suppliers, List.of());
    }

    @Test
    void requiresAuthentication() throws Exception {
        mockMvc.perform(get("/dashboard/summary"))
                .andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMIN", "MANAGER", "STOCK"})
    void includesSuppliersForSupplierReaders(String role) throws Exception {
        when(dashboardService.summary(true)).thenReturn(summary(3L));

        mockMvc.perform(get("/dashboard/summary").with(asRole(role)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeSuppliers").value(3));

        verify(dashboardService).summary(true);
    }

    @Test
    void cashierGetsSummaryWithoutSuppliers() throws Exception {
        when(dashboardService.summary(false)).thenReturn(summary(null));

        mockMvc.perform(get("/dashboard/summary").with(asRole("CASHIER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeSuppliers").value(nullValue()));

        verify(dashboardService).summary(false);
    }
}
