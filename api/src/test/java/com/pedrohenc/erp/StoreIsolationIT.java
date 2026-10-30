package com.pedrohenc.erp;

import com.jayway.jsonpath.JsonPath;
import com.pedrohenc.erp.entity.TbBrand;
import com.pedrohenc.erp.entity.TbProduct;
import com.pedrohenc.erp.entity.TbStore;
import com.pedrohenc.erp.entity.TbSupplier;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UserRole;
import com.pedrohenc.erp.repository.BrandRepository;
import com.pedrohenc.erp.repository.ProductRepository;
import com.pedrohenc.erp.repository.StoreRepository;
import com.pedrohenc.erp.repository.SupplierRepository;
import com.pedrohenc.erp.repository.UserRepository;
import com.pedrohenc.erp.security.RefreshCookies;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Two stores side by side behind the real HTTP stack and a real PostgreSQL: whatever store A does, it
 * never sees or changes store B's data. Every request carries the bearer from {@code POST /auth/login}.
 * Skipped when Docker is not available.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class StoreIsolationIT {

    private static final String STORE_A_NAME = "Isolation A";
    private static final String STORE_B_NAME = "Isolation B";
    private static final String PASSWORD = "isolation-pass-1";
    private static final String X_REQUESTED_WITH = "X-Requested-With";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private StoreRepository storeRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private BrandRepository brandRepository;
    @Autowired
    private SupplierRepository supplierRepository;
    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtEncoder jwtEncoder;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Seed a;
    private Seed b;

    /** What one store owns: an ADMIN, a brand, a supplier and a product. */
    private record Seed(long storeId, String email, long adminId, long brandId, long supplierId, long productId,
                        String sku, String barcode, String brandName, String taxId) {
    }

    @BeforeEach
    void seed() {
        cleanUp();
        a = seedStore(STORE_A_NAME, "a", "10000000");
        b = seedStore(STORE_B_NAME, "b", "20000000");
    }

    @AfterEach
    void cleanUp() {
        SecurityContextHolder.clearContext();
        // Only what this test created, found through its dedicated stores, in FK-safe order.
        String stores = "(select id from shop_api.tb_stores where name in ('" + STORE_A_NAME + "', '" + STORE_B_NAME + "'))";
        jdbcTemplate.update("delete from shop_api.tb_refresh_tokens where user_id in "
                + "(select id from shop_api.tb_users where store_id in " + stores + ")");
        jdbcTemplate.update("delete from shop_api.tb_products where store_id in " + stores);
        jdbcTemplate.update("delete from shop_api.tb_brands where store_id in " + stores);
        jdbcTemplate.update("delete from shop_api.tb_suppliers where store_id in " + stores);
        jdbcTemplate.update("delete from shop_api.tb_users where store_id in " + stores);
        jdbcTemplate.update("delete from shop_api.tb_stores where name in ('" + STORE_A_NAME + "', '" + STORE_B_NAME + "')");
    }

    /** Root mode (no authentication): every row gets its store explicitly. */
    private Seed seedStore(String storeName, String key, String barcode) {
        long storeId = storeRepository.save(TbStore.builder().name(storeName).build()).getId();
        String email = "admin-" + key + "@isolation.test";
        long adminId = userRepository.save(TbUser.builder()
                .storeId(storeId)
                .name("Admin " + key)
                .email(email)
                .passwordHash(passwordEncoder.encode(PASSWORD))
                .role(UserRole.ADMIN)
                .active(true)
                .build()).getId();
        String brandName = "Iso Brand " + key;
        TbBrand brand = brandRepository.save(TbBrand.builder().storeId(storeId).name(brandName).active(true).build());
        String taxId = "ISOTAX" + key.toUpperCase();
        long supplierId = supplierRepository.save(TbSupplier.builder()
                .storeId(storeId)
                .legalName("Iso Supplier " + key)
                .taxId(taxId)
                .active(true)
                .build()).getId();
        String sku = "ISO-" + key.toUpperCase() + "-1";
        long productId = productRepository.save(TbProduct.builder()
                .storeId(storeId)
                .sku(sku)
                .barcode(barcode)
                .name("Iso Product " + key)
                .category("Iso")
                .brand(brand)
                .price(new BigDecimal("10.00"))
                .stockQuantity(new BigDecimal("5.000"))
                .active(true)
                .build()).getId();
        return new Seed(storeId, email, adminId, brand.getId(), supplierId, productId, sku, barcode, brandName, taxId);
    }

    private MvcResult login(String email) throws Exception {
        return mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andReturn();
    }

    private String bearerOf(Seed seed) throws Exception {
        MvcResult result = login(seed.email());
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return "Bearer " + JsonPath.<String>read(result.getResponse().getContentAsString(), "$.accessToken");
    }

    private MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, String bearer, String body) {
        return request.header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON).content(body);
    }

    private List<Long> ids(String bearer, String path) throws Exception {
        String body = mockMvc.perform(get(path).param("size", "100").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<Number> ids = JsonPath.read(body, "$.content[*].id");
        return ids.stream().map(Number::longValue).toList();
    }

    private static String productBody(String sku, String barcode, String name) {
        return """
                {"sku":"%s","barcode":"%s","name":"%s","category":"Iso","price":99.99,"unitOfMeasure":"UNIT",
                "stockQuantity":1.000,"minimumStock":0.000,"reorderPoint":0.000,"allowNegativeStock":false,"active":false}
                """.formatted(sku, barcode, name);
    }

    private static String brandBody(String name, boolean active) {
        return "{\"name\":\"" + name + "\",\"active\":" + active + "}";
    }

    private static String supplierBody(String legalName, String taxId, boolean active) {
        return "{\"legalName\":\"" + legalName + "\",\"taxId\":\"" + taxId + "\",\"active\":" + active + "}";
    }

    private static String userBody(String name, String email, boolean active) {
        return "{\"name\":\"" + name + "\",\"email\":\"" + email + "\",\"role\":\"CASHIER\",\"active\":" + active + "}";
    }

    @Test
    void listsShowOnlyOwnStore() throws Exception {
        String bearer = bearerOf(a);

        assertThat(ids(bearer, "/products/page")).containsExactly(a.productId());
        assertThat(ids(bearer, "/brands/page")).containsExactly(a.brandId());
        assertThat(ids(bearer, "/suppliers/page")).containsExactly(a.supplierId());
        assertThat(ids(bearer, "/users/page")).containsExactly(a.adminId());
    }

    @Test
    void dashboardCountsOnlyOwnStore() throws Exception {
        // B gets a second active product; A must still count only its own single one.
        productRepository.save(TbProduct.builder()
                .storeId(b.storeId())
                .sku("ISO-B-2")
                .name("Iso Product b2")
                .category("Iso")
                .price(new BigDecimal("1.00"))
                .active(true)
                .build());
        String bearer = bearerOf(a);

        mockMvc.perform(get("/dashboard/summary").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeProducts").value(1))
                .andExpect(jsonPath("$.activeBrands").value(1))
                .andExpect(jsonPath("$.activeSuppliers").value(1))
                .andExpect(jsonPath("$.inventoryValue").value(50.0));
    }

    @Test
    void readsOfOtherStoreAre404() throws Exception {
        String bearer = bearerOf(a);

        mockMvc.perform(get("/products/" + b.productId()).header("Authorization", bearer)).andExpect(status().isNotFound());
        mockMvc.perform(get("/brands/" + b.brandId()).header("Authorization", bearer)).andExpect(status().isNotFound());
        mockMvc.perform(get("/suppliers/" + b.supplierId()).header("Authorization", bearer)).andExpect(status().isNotFound());
        mockMvc.perform(get("/users/" + b.adminId()).header("Authorization", bearer)).andExpect(status().isNotFound());
    }

    @Test
    void writesOfOtherStoreAre404() throws Exception {
        String bearer = bearerOf(a);
        String statusOff = "{\"active\":false}";

        mockMvc.perform(json(put("/products/" + b.productId()), bearer, productBody("HACKED", "30000000", "Hacked")))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/products/" + b.productId()).header("Authorization", bearer))
                .andExpect(status().isNotFound());
        mockMvc.perform(json(put("/brands/" + b.brandId()), bearer, brandBody("Hacked", false)))
                .andExpect(status().isNotFound());
        mockMvc.perform(json(patch("/brands/" + b.brandId() + "/status"), bearer, statusOff))
                .andExpect(status().isNotFound());
        mockMvc.perform(json(put("/suppliers/" + b.supplierId()), bearer, supplierBody("Hacked", "HACKED", false)))
                .andExpect(status().isNotFound());
        mockMvc.perform(json(patch("/suppliers/" + b.supplierId() + "/status"), bearer, statusOff))
                .andExpect(status().isNotFound());
        mockMvc.perform(json(put("/users/" + b.adminId()), bearer, userBody("Hacked", "hacked@isolation.test", false)))
                .andExpect(status().isNotFound());
        mockMvc.perform(json(patch("/users/" + b.adminId() + "/status"), bearer, statusOff))
                .andExpect(status().isNotFound());
        mockMvc.perform(json(post("/users/" + b.adminId() + "/password"), bearer, "{\"password\":\"hacked-pass-123\"}"))
                .andExpect(status().isNotFound());

        // B's rows are exactly as seeded.
        assertThat(jdbcTemplate.queryForMap("select sku, barcode, name, active from shop_api.tb_products where id = ?",
                b.productId()))
                .containsEntry("sku", b.sku()).containsEntry("barcode", b.barcode())
                .containsEntry("name", "Iso Product b").containsEntry("active", true);
        assertThat(jdbcTemplate.queryForMap("select name, active from shop_api.tb_brands where id = ?", b.brandId()))
                .containsEntry("name", b.brandName()).containsEntry("active", true);
        assertThat(jdbcTemplate.queryForMap("select legal_name, tax_id, active from shop_api.tb_suppliers where id = ?",
                b.supplierId()))
                .containsEntry("legal_name", "Iso Supplier b").containsEntry("tax_id", b.taxId())
                .containsEntry("active", true);
        assertThat(jdbcTemplate.queryForMap("select name, email, active from shop_api.tb_users where id = ?", b.adminId()))
                .containsEntry("name", "Admin b").containsEntry("email", b.email()).containsEntry("active", true);
        // The password is unchanged too: B can still log in with the original one.
        assertThat(login(b.email()).getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void sameSkuBarcodeBrandTaxIdAllowedAcrossStores() throws Exception {
        String bearer = bearerOf(b);

        mockMvc.perform(json(post("/products"), bearer, productBody(a.sku(), a.barcode(), "B copy of A")))
                .andExpect(status().isCreated());
        mockMvc.perform(json(post("/brands"), bearer, brandBody(a.brandName(), true)))
                .andExpect(status().isCreated());
        mockMvc.perform(json(post("/suppliers"), bearer, supplierBody("B copy of A", a.taxId(), true)))
                .andExpect(status().isCreated());
    }

    @Test
    void duplicateWithinStoreIsFieldError() throws Exception {
        String bearer = bearerOf(a);

        mockMvc.perform(json(post("/products"), bearer, productBody(a.sku(), "40000000", "Again")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.sku").exists());
    }

    @Test
    void emailOfOtherStoreIsFieldError() throws Exception {
        String bearer = bearerOf(a);
        String body = "{\"name\":\"Dup\",\"email\":\"" + b.email() + "\",\"role\":\"CASHIER\",\"active\":true,"
                + "\"password\":\"" + PASSWORD + "\"}";

        mockMvc.perform(json(post("/users"), bearer, body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").exists());
    }

    @Test
    void tokenWithoutStoreClaimIs401() throws Exception {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(String.valueOf(a.adminId()))
                .issuedAt(now)
                .expiresAt(now.plusSeconds(600))
                .claim("email", a.email())
                .claim("role", UserRole.ADMIN.name())
                .build();
        String token = jwtEncoder.encode(
                JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();

        mockMvc.perform(get("/products/page").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void suspendedStoreCannotLoginOrRefresh() throws Exception {
        MvcResult login = login(b.email());
        assertThat(login.getResponse().getStatus()).isEqualTo(200);
        Cookie refresh = login.getResponse().getCookie(RefreshCookies.NAME);
        assertThat(refresh).isNotNull();

        setStoreActive(b, false);

        mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + b.email() + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("This store is suspended"));
        mockMvc.perform(post("/auth/refresh").header(X_REQUESTED_WITH, "XMLHttpRequest").cookie(refresh))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("This store is suspended"));

        // The refused refresh rolled its rotation back: once the store is back, the same cookie still works.
        setStoreActive(b, true);
        mockMvc.perform(post("/auth/refresh").header(X_REQUESTED_WITH, "XMLHttpRequest").cookie(refresh))
                .andExpect(status().isOk());
    }

    private void setStoreActive(Seed seed, boolean active) {
        jdbcTemplate.update("update shop_api.tb_stores set active = ? where id = ?", active, seed.storeId());
    }
}
