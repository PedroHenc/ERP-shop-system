package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.config.SecurityConfig;
import com.pedrohenc.erp.dto.stock.StockMovementPageResponse;
import com.pedrohenc.erp.dto.stock.StockMovementResponse;
import com.pedrohenc.erp.entity.StockMovementReason;
import com.pedrohenc.erp.entity.StockMovementType;
import com.pedrohenc.erp.entity.UnitOfMeasure;
import com.pedrohenc.erp.security.JwtConfig;
import com.pedrohenc.erp.security.ProblemDetailAuthHandlers;
import com.pedrohenc.erp.service.StockMovementService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(StockMovementController.class)
@Import({SecurityConfig.class, JwtConfig.class, ProblemDetailAuthHandlers.class})
class StockMovementControllerTest {

    private static final String ENTRY = "{\"type\":\"ENTRY\",\"reason\":\"PURCHASE\",\"quantity\":5}";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StockMovementService stockMovementService;

    private static RequestPostProcessor asRole(String role) {
        return jwt().jwt(token -> token.subject("4")).authorities(new SimpleGrantedAuthority("ROLE_" + role));
    }

    private static StockMovementResponse movement() {
        return new StockMovementResponse(1L, 7L, "Granola", "SKU-7", UnitOfMeasure.UNIT, StockMovementType.ENTRY,
                StockMovementReason.PURCHASE, new BigDecimal("5"), new BigDecimal("15"), null, "Sam Stock",
                Instant.parse("2026-10-30T12:00:00Z"));
    }

    @Test
    void stockStaffRecordAMovementAsThemselves() throws Exception {
        when(stockMovementService.record(eq(4L), eq(7L), any())).thenReturn(movement());

        mockMvc.perform(post("/products/7/stock-movements").with(asRole("STOCK"))
                        .contentType(MediaType.APPLICATION_JSON).content(ENTRY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.balanceAfter").value(15))
                .andExpect(jsonPath("$.createdByName").value("Sam Stock"));
    }

    @Test
    void cashiersCannotMoveStockNorReadTheHistory() throws Exception {
        mockMvc.perform(post("/products/7/stock-movements").with(asRole("CASHIER"))
                        .contentType(MediaType.APPLICATION_JSON).content(ENTRY))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/stock-movements/page").with(asRole("CASHIER")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(stockMovementService);
    }

    @Test
    void missingFieldsAndNegativeQuantitiesAreRejected() throws Exception {
        mockMvc.perform(post("/products/7/stock-movements").with(asRole("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"quantity\":-1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.type").exists())
                .andExpect(jsonPath("$.errors.reason").exists())
                .andExpect(jsonPath("$.errors.quantity").exists());
        verifyNoInteractions(stockMovementService);
    }

    @Test
    void managersReadTheStoreHistoryFilteredByDate() throws Exception {
        when(stockMovementService.findPage(any())).thenReturn(new StockMovementPageResponse(List.of(movement()), 0, 20, 1, 1, true));

        mockMvc.perform(get("/stock-movements/page").with(asRole("MANAGER"))
                        .param("type", "ENTRY").param("from", "2026-10-01T03:00:00Z").param("to", "2026-11-01T03:00:00Z"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].productName").value("Granola"));
    }
}
