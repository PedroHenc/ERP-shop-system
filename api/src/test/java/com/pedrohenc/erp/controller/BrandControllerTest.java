package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.config.SecurityConfig;
import com.pedrohenc.erp.dto.brand.BrandDetailResponse;
import com.pedrohenc.erp.dto.brand.BrandPageResponse;
import com.pedrohenc.erp.dto.brand.BrandResponse;
import com.pedrohenc.erp.exception.ResourceNotFoundException;
import com.pedrohenc.erp.service.BrandService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.endsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BrandController.class)
@Import(SecurityConfig.class)
class BrandControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BrandService brandService;

    private static BrandDetailResponse detail(boolean active) {
        return new BrandDetailResponse(1L, 0L, "Acme", active, LocalDateTime.now(), LocalDateTime.now());
    }

    @Test
    void listsActiveBrands() throws Exception {
        when(brandService.findActive())
                .thenReturn(List.of(new BrandResponse(2L, "Acme"), new BrandResponse(1L, "Zeta")));

        mockMvc.perform(get("/brands"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Acme"))
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void pageReturnsBrands() throws Exception {
        when(brandService.findPage(any()))
                .thenReturn(new BrandPageResponse(List.of(detail(true)), 0, 20, 1, 1, true));

        mockMvc.perform(get("/brands/page").param("name", "ac").param("active", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Acme"));
    }

    @Test
    void createReturns201WithLocation() throws Exception {
        when(brandService.create(any())).thenReturn(detail(true));

        mockMvc.perform(post("/brands")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Acme\",\"active\":true}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", endsWith("/brands/1")));
    }

    @Test
    void blankNameReturns400() throws Exception {
        mockMvc.perform(post("/brands")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"active\":true}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.name").exists());
    }

    @Test
    void findByIdReturns404() throws Exception {
        when(brandService.findById(9L)).thenThrow(new ResourceNotFoundException("Brand", 9L));

        mockMvc.perform(get("/brands/9"))
                .andExpect(status().isNotFound());
    }

    @Test
    void patchStatusReturns200() throws Exception {
        when(brandService.setStatus(1L, false)).thenReturn(detail(false));

        mockMvc.perform(patch("/brands/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));
    }

    @Test
    void patchStatusWithoutActiveReturns400() throws Exception {
        mockMvc.perform(patch("/brands/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.active").exists());
    }
}
