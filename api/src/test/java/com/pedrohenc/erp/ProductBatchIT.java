package com.pedrohenc.erp;

import com.jayway.jsonpath.JsonPath;
import com.pedrohenc.erp.entity.TbProduct;
import com.pedrohenc.erp.entity.TbStore;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UserRole;
import com.pedrohenc.erp.repository.ProductRepository;
import com.pedrohenc.erp.repository.StoreRepository;
import com.pedrohenc.erp.repository.UserRepository;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Several new products in one request (batch scanning): all or none, with errors naming the row. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class ProductBatchIT {

    private static final String PREFIX = "Batch IT";
    private static final String PASSWORD = "batch-pass-1";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private StoreRepository storeRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    private long storeId;

    @BeforeEach
    void seed() {
        cleanUp();
        storeId = storeRepository.save(TbStore.builder().name(PREFIX + " Store").build()).getId();
        user("stock@batch.test", UserRole.STOCK);
        user("cashier@batch.test", UserRole.CASHIER);
        productRepository.save(TbProduct.builder().storeId(storeId).sku("OLD-1").barcode("7890000000017").name("Old")
                .category("Food").price(new BigDecimal("1.00")).stockQuantity(BigDecimal.ZERO).build());
    }

    @AfterEach
    void cleanUp() {
        SecurityContextHolder.clearContext();
        String stores = "(select id from shop_api.tb_stores where name like '" + PREFIX + "%')";
        jdbcTemplate.update("delete from shop_api.tb_refresh_tokens where user_id in "
                + "(select id from shop_api.tb_users where store_id in " + stores + ")");
        jdbcTemplate.update("delete from shop_api.tb_stock_movements where store_id in " + stores);
        jdbcTemplate.update("delete from shop_api.tb_products where store_id in " + stores);
        jdbcTemplate.update("delete from shop_api.tb_users where store_id in " + stores);
        jdbcTemplate.update("delete from shop_api.tb_stores where name like '" + PREFIX + "%'");
    }

    private void user(String email, UserRole role) {
        userRepository.save(TbUser.builder().storeId(storeId).name(role.name()).email(email)
                .passwordHash(passwordEncoder.encode(PASSWORD)).role(role).active(true).build());
    }

    private String bearerOf(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk()).andReturn();
        return "Bearer " + JsonPath.<String>read(result.getResponse().getContentAsString(), "$.accessToken");
    }

    private static String product(String sku, String barcode, String name, String stock) {
        return """
                {"sku":"%s","barcode":%s,"name":"%s","category":"Food","price":4.50,"unitOfMeasure":"UNIT",
                 "stockQuantity":%s,"minimumStock":0,"reorderPoint":0,"allowNegativeStock":false,"active":true}"""
                .formatted(sku, barcode == null ? "null" : "\"" + barcode + "\"", name, stock);
    }

    private MvcResult batch(String bearer, String... products) throws Exception {
        return mockMvc.perform(post("/products/batch").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                .content("{\"products\":[" + String.join(",", products) + "]}")).andReturn();
    }

    private long count() {
        return jdbcTemplate.queryForObject("select count(*) from shop_api.tb_products where store_id = ?", Long.class, storeId);
    }

    @Test
    void createsEveryProductWithItsStartingStock() throws Exception {
        MvcResult result = batch(bearerOf("stock@batch.test"),
                product("7891234567895", "7891234567895", "Coffee", "12"),
                product("NO-CODE", null, "Bread", "0"));

        assertThat(result.getResponse().getStatus()).isEqualTo(201);
        assertThat(JsonPath.<Integer>read(result.getResponse().getContentAsString(), "$.length()")).isEqualTo(2);
        assertThat(count()).isEqualTo(3);
        assertThat(jdbcTemplate.queryForObject("select count(*) from shop_api.tb_stock_movements m join shop_api.tb_products p "
                + "on p.id = m.product_id where p.sku = '7891234567895' and m.type = 'INITIAL'", Long.class)).isEqualTo(1);
    }

    @Test
    void savesNothingWhenARowIsInvalidAndNamesTheRow() throws Exception {
        String bearer = bearerOf("stock@batch.test");
        // Row 1 reuses a barcode already in the catalogue.
        mockMvc.perform(post("/products/batch").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"products\":[" + product("A-1", "7891234567895", "Coffee", "1") + ","
                                + product("A-2", "7890000000017", "Tea", "1") + "]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors['products[1].barcode']").exists());
        // Row 1 repeats row 0's SKU.
        mockMvc.perform(post("/products/batch").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"products\":[" + product("A-1", null, "Coffee", "1") + ","
                                + product("A-1", null, "Tea", "1") + "]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors['products[1].sku']").exists());
        // Bean validation names the row too.
        mockMvc.perform(post("/products/batch").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"products\":[" + product("A-1", null, "", "1") + "]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors['products[0].name']").exists());
        assertThat(count()).isEqualTo(1);
    }

    @Test
    void cashiersCannotAndEmptyBatchesAreRefused() throws Exception {
        assertThat(batch(bearerOf("cashier@batch.test"), product("C-1", null, "X", "0")).getResponse().getStatus()).isEqualTo(403);
        assertThat(batch(bearerOf("stock@batch.test")).getResponse().getStatus()).isEqualTo(400);
    }
}
