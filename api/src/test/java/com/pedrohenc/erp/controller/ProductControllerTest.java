package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.config.SecurityConfig;
import com.pedrohenc.erp.security.JwtConfig;
import com.pedrohenc.erp.security.ProblemDetailAuthHandlers;
import com.pedrohenc.erp.dto.product.ProductPageResponse;
import com.pedrohenc.erp.exception.FieldErrorException;
import com.pedrohenc.erp.service.ProductService;
import com.pedrohenc.erp.entity.TbProduct;
import org.junit.jupiter.api.Test;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProductController.class)
@Import({SecurityConfig.class, JwtConfig.class, ProblemDetailAuthHandlers.class})
class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private static RequestPostProcessor asRole(String role) {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role));
    }

    private static RequestPostProcessor admin() {
        return asRole("ADMIN");
    }

    @MockitoBean
    private ProductService productService;

    @Test
    void pageEndpointIsPublic() throws Exception {
        when(productService.findPage(any()))
                .thenReturn(new ProductPageResponse(List.of(), 0, 10, 0, 0, true));

        mockMvc.perform(get("/products/page").with(admin()))
                .andExpect(status().isOk());
    }

    @Test
    void corsPreflightAllowsConfiguredOrigin() throws Exception {
        mockMvc.perform(options("/products")
                        .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "authorization,x-requested-with"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
    }

    @Test
    void corsPreflightAllowsPatch() throws Exception {
        mockMvc.perform(options("/products/1")
                        .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "PATCH")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "authorization,x-requested-with"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
    }

    @Test
    void duplicateSkuReturns400WithFieldError() throws Exception {
        when(productService.create(any()))
                .thenThrow(new FieldErrorException("sku", "A product with this SKU already exists"));

        mockMvc.perform(post("/products").with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(productJson("SKU-1", "10", "UNIT")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Validation failed"))
                .andExpect(jsonPath("$.errors.sku").value("A product with this SKU already exists"));
    }

    private static String productJson(String sku, String price, String unitOfMeasure) {
        return """
                {"sku":"%s","name":"Widget","category":"Tools","price":%s,"unitOfMeasure":"%s",
                "stockQuantity":1,"minimumStock":0,"reorderPoint":0,"allowNegativeStock":false,"active":true}
                """.formatted(sku, price, unitOfMeasure);
    }

    @Test
    void invalidBodyReturns400WithFieldErrors() throws Exception {
        mockMvc.perform(post("/products").with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(productJson("", "-1", "UNIT")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.detail").value("Validation failed"))
                .andExpect(jsonPath("$.errors.sku").exists())
                .andExpect(jsonPath("$.errors.price").exists());
    }

    @Test
    void invalidPageParamsReturn400WithFieldErrors() throws Exception {
        mockMvc.perform(get("/products/page").with(admin()).param("size", "500"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Validation failed"))
                .andExpect(jsonPath("$.errors.size").exists());
    }

    @Test
    void malformedBodyReturns400() throws Exception {
        mockMvc.perform(post("/products").with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(productJson("SKU-1", "10", "BANANA")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Malformed request body"));
    }

    @Test
    void corsPreflightRejectsUnknownOrigin() throws Exception {
        mockMvc.perform(options("/products")
                        .header(HttpHeaders.ORIGIN, "https://evil.example")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isForbidden());
    }

    @Test
    void staleUpdateReturns409() throws Exception {
        when(productService.update(eq(1L), any()))
                .thenThrow(new ObjectOptimisticLockingFailureException(TbProduct.class, 1L));

        mockMvc.perform(put("/products/1").with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(productJson("SKU-1", "10", "UNIT")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("The resource was modified by another user"));
    }

    @Test
    void unauthenticatedRequestReturns401() throws Exception {
        mockMvc.perform(get("/products/page"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Authentication required"));
    }

    @Test
    void cashierCannotCreateProduct() throws Exception {
        mockMvc.perform(post("/products").with(asRole("CASHIER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(productJson("SKU-1", "10", "UNIT")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("You don't have permission to perform this action"));
    }

    @Test
    void cashierCanReadProducts() throws Exception {
        when(productService.findPage(any()))
                .thenReturn(new ProductPageResponse(List.of(), 0, 10, 0, 0, true));

        mockMvc.perform(get("/products/page").with(asRole("CASHIER")))
                .andExpect(status().isOk());
    }
}