package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.config.SecurityConfig;
import com.pedrohenc.erp.dto.brand.BrandResponse;
import com.pedrohenc.erp.service.BrandService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BrandController.class)
@Import(SecurityConfig.class)
class BrandControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BrandService brandService;

    @Test
    void listsActiveBrands() throws Exception {
        when(brandService.findActive())
                .thenReturn(List.of(new BrandResponse(2L, "Acme"), new BrandResponse(1L, "Zeta")));

        mockMvc.perform(get("/brands"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Acme"))
                .andExpect(jsonPath("$.length()").value(2));
    }
}
