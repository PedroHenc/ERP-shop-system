package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.config.SecurityConfig;
import com.pedrohenc.erp.dto.supplier.SupplierPageResponse;
import com.pedrohenc.erp.dto.supplier.SupplierRequest;
import com.pedrohenc.erp.dto.supplier.SupplierResponse;
import com.pedrohenc.erp.exception.FieldErrorException;
import com.pedrohenc.erp.exception.ResourceNotFoundException;
import com.pedrohenc.erp.service.SupplierService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.endsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SupplierController.class)
@Import(SecurityConfig.class)
class SupplierControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SupplierService supplierService;

    private static SupplierResponse detail(boolean active) {
        return new SupplierResponse(1L, 0L, "Acme Ltda", "Acme", "12345678000190", "a@acme.com", "1199999",
                active, LocalDateTime.now(), LocalDateTime.now());
    }

    @Test
    void pageReturnsSuppliers() throws Exception {
        when(supplierService.findPage(any()))
                .thenReturn(new SupplierPageResponse(List.of(detail(true)), 0, 20, 1, 1, true));

        mockMvc.perform(get("/suppliers/page").param("name", "ac"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].legalName").value("Acme Ltda"));
    }

    @Test
    void createReturns201WithLocation() throws Exception {
        when(supplierService.create(any())).thenReturn(detail(true));

        mockMvc.perform(post("/suppliers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"legalName\":\"Acme Ltda\",\"active\":true}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", endsWith("/suppliers/1")));
    }

    @Test
    void invalidEmailReturns400() throws Exception {
        mockMvc.perform(post("/suppliers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"legalName\":\"Acme Ltda\",\"email\":\"not-an-email\",\"active\":true}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").exists());
    }

    @Test
    void blankLegalNameReturns400() throws Exception {
        mockMvc.perform(post("/suppliers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"legalName\":\"\",\"active\":true}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.legalName").exists());
    }

    @Test
    void staleUpdateReturns409() throws Exception {
        when(supplierService.update(eq(1L), any()))
                .thenThrow(new ObjectOptimisticLockingFailureException(Object.class, 1L));

        mockMvc.perform(put("/suppliers/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"legalName\":\"Acme Ltda\",\"active\":true,\"version\":0}"))
                .andExpect(status().isConflict());
    }

    @Test
    void patchStatusReturns200() throws Exception {
        when(supplierService.setStatus(1L, false)).thenReturn(detail(false));

        mockMvc.perform(patch("/suppliers/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));
    }

    @Test
    void unauthenticatedAccessIsAllowed() throws Exception {
        when(supplierService.findPage(any()))
                .thenReturn(new SupplierPageResponse(List.of(), 0, 20, 0, 0, true));

        mockMvc.perform(get("/suppliers/page"))
                .andExpect(status().isOk());
    }

    @Test
    void whitespaceOnlyEmailIsTreatedAsNull() throws Exception {
        when(supplierService.create(any())).thenReturn(detail(true));

        mockMvc.perform(post("/suppliers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"legalName\":\"Acme Ltda\",\"email\":\"   \",\"active\":true}"))
                .andExpect(status().isCreated());

        ArgumentCaptor<SupplierRequest> captor = ArgumentCaptor.forClass(SupplierRequest.class);
        verify(supplierService).create(captor.capture());
        assertThat(captor.getValue().email()).isNull();
    }

    @Test
    void emailIsTrimmedBeforeValidation() throws Exception {
        when(supplierService.create(any())).thenReturn(detail(true));

        mockMvc.perform(post("/suppliers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"legalName\":\"Acme Ltda\",\"email\":\" a@b.com \",\"active\":true}"))
                .andExpect(status().isCreated());

        ArgumentCaptor<SupplierRequest> captor = ArgumentCaptor.forClass(SupplierRequest.class);
        verify(supplierService).create(captor.capture());
        assertThat(captor.getValue().email()).isEqualTo("a@b.com");
    }

    @Test
    void duplicateTaxIdReturns400WithFieldError() throws Exception {
        when(supplierService.create(any()))
                .thenThrow(new FieldErrorException("taxId", "A supplier with this tax ID already exists"));

        mockMvc.perform(post("/suppliers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"legalName\":\"Acme Ltda\",\"taxId\":\"12345678000190\",\"active\":true}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.taxId").value("A supplier with this tax ID already exists"));
    }

    @Test
    void findByIdReturns404() throws Exception {
        when(supplierService.findById(9L)).thenThrow(new ResourceNotFoundException("Supplier", 9L));

        mockMvc.perform(get("/suppliers/9"))
                .andExpect(status().isNotFound());
    }

    @Test
    void corsPreflightAllowsPatch() throws Exception {
        mockMvc.perform(options("/suppliers/1")
                        .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "PATCH"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"));
    }
}
