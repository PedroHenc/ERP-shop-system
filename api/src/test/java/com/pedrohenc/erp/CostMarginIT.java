package com.pedrohenc.erp;

import com.jayway.jsonpath.JsonPath;
import com.pedrohenc.erp.entity.TbStore;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UserRole;
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

import java.time.Duration;
import java.time.Instant;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Cost prices and the profit built on them: hidden from cashiers, frozen on each sold line, shared-out
 * sale discounts, and lines without a cost left out of the margin instead of inflating it.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class CostMarginIT {

    private static final String PREFIX = "Cost IT";
    private static final String PASSWORD = "cost-pass-1";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private StoreRepository storeRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    private String manager;
    private String cashier;
    private long coffee;
    private long bread;
    private String from;
    private String to;

    @BeforeEach
    void seed() throws Exception {
        cleanUp();
        long store = storeRepository.save(TbStore.builder().name(PREFIX).build()).getId();
        user(store, "manager@cost.test", UserRole.MANAGER);
        user(store, "cashier@cost.test", UserRole.CASHIER);
        manager = bearerOf("manager@cost.test");
        cashier = bearerOf("cashier@cost.test");
        coffee = create("COST-1", "Coffee", "Drinks", "10.00", "6.00");
        bread = create("COST-2", "Bread", "Bakery", "5.00", null);
        from = Instant.now().minus(Duration.ofHours(1)).toString();
        to = Instant.now().plus(Duration.ofHours(1)).toString();
    }

    @AfterEach
    void cleanUp() {
        SecurityContextHolder.clearContext();
        String stores = "(select id from shop_api.tb_stores where name like '" + PREFIX + "%')";
        jdbcTemplate.update("delete from shop_api.tb_refresh_tokens where user_id in "
                + "(select id from shop_api.tb_users where store_id in " + stores + ")");
        jdbcTemplate.update("delete from shop_api.tb_stock_movements where store_id in " + stores);
        jdbcTemplate.update("delete from shop_api.tb_sales where store_id in " + stores);
        jdbcTemplate.update("delete from shop_api.tb_products where store_id in " + stores);
        jdbcTemplate.update("delete from shop_api.tb_users where store_id in " + stores);
        jdbcTemplate.update("delete from shop_api.tb_stores where name like '" + PREFIX + "%'");
    }

    private void user(long storeId, String email, UserRole role) {
        userRepository.save(TbUser.builder().storeId(storeId).name(role.name()).email(email)
                .passwordHash(passwordEncoder.encode(PASSWORD)).role(role).active(true).build());
    }

    private String bearerOf(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk()).andReturn();
        return "Bearer " + JsonPath.<String>read(result.getResponse().getContentAsString(), "$.accessToken");
    }

    private static String product(String sku, String name, String category, String price, String cost) {
        return """
                {"sku":"%s","name":"%s","category":"%s","price":%s,"costPrice":%s,"unitOfMeasure":"UNIT",
                 "stockQuantity":50,"minimumStock":0,"reorderPoint":0,"allowNegativeStock":false,"active":true}"""
                .formatted(sku, name, category, price, cost == null ? "null" : cost);
    }

    private long create(String sku, String name, String category, String price, String cost) throws Exception {
        String body = mockMvc.perform(post("/products").header("Authorization", manager).contentType(MediaType.APPLICATION_JSON)
                        .content(product(sku, name, category, price, cost)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    @Test
    void cashiersDoNotSeeCosts() throws Exception {
        mockMvc.perform(get("/products/" + coffee).header("Authorization", manager))
                .andExpect(jsonPath("$.costPrice").value(6.0));
        mockMvc.perform(get("/products/" + coffee).header("Authorization", cashier))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.costPrice").value(nullValue()));
        mockMvc.perform(get("/products/page").header("Authorization", cashier).param("search", "COST-1"))
                .andExpect(jsonPath("$.content[0].costPrice").value(nullValue()));
    }

    @Test
    void profitSharesOutTheSaleDiscountLeavesUncostedLinesOutAndKeepsTheCostOfTheDay() throws Exception {
        // 2 coffee (20.00, cost 12.00) + 1 bread without cost (5.00) − 2.50 on the whole sale = 22.50.
        mockMvc.perform(post("/sales").header("Authorization", cashier).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[{\"productId\":%d,\"quantity\":2},{\"productId\":%d,\"quantity\":1}],\"discount\":2.5,\"paymentMethod\":\"PIX\"}"
                                .formatted(coffee, bread)))
                .andExpect(status().isCreated());
        // A later cost does not rewrite this sale's profit.
        mockMvc.perform(put("/products/" + coffee).header("Authorization", manager).contentType(MediaType.APPLICATION_JSON)
                        .content(product("COST-1", "Coffee", "Drinks", "10.00", "9.00")))
                .andExpect(status().isOk());

        mockMvc.perform(get("/reports/sales").header("Authorization", manager).param("from", from).param("to", to))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totals.revenue").value(22.5))
                // Coffee's 20.00 carries 20/25 of the 2.50 discount: 18.00, cost 12.00.
                .andExpect(jsonPath("$.totals.costedRevenue").value(18.0))
                .andExpect(jsonPath("$.totals.cost").value(12.0))
                .andExpect(jsonPath("$.totals.grossProfit").value(6.0))
                .andExpect(jsonPath("$.totals.margin").value(0.3333))
                // Per product and category, on line totals (before the sale-wide discount).
                .andExpect(jsonPath("$.topProducts[0].name").value("Coffee"))
                .andExpect(jsonPath("$.topProducts[0].profit").value(8.0))
                .andExpect(jsonPath("$.topProducts[0].margin").value(0.4))
                .andExpect(jsonPath("$.topProducts[1].name").value("Bread"))
                .andExpect(jsonPath("$.topProducts[1].profit").value(nullValue()))
                .andExpect(jsonPath("$.topProducts[1].margin").value(nullValue()))
                .andExpect(jsonPath("$.byCategory[0].category").value("Drinks"))
                .andExpect(jsonPath("$.byCategory[0].profit").value(8.0))
                .andExpect(jsonPath("$.byCategory[1].category").value("Bakery"))
                .andExpect(jsonPath("$.byCategory[1].profit").value(nullValue()));
    }

    @Test
    void theStockReportValuesStockAtCostWhereThereIsOne() throws Exception {
        // Coffee: 50 × 9.00 after the change below; bread has no cost.
        mockMvc.perform(put("/products/" + coffee).header("Authorization", manager).contentType(MediaType.APPLICATION_JSON)
                .content(product("COST-1", "Coffee", "Drinks", "10.00", "9.00"))).andExpect(status().isOk());

        mockMvc.perform(get("/reports/stock").header("Authorization", manager).param("from", from).param("to", to))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stockByCategory[?(@.category == 'Drinks')].costValue").value(450.0))
                .andExpect(jsonPath("$.stockByCategory[?(@.category == 'Drinks')].value").value(500.0))
                .andExpect(jsonPath("$.stockByCategory[?(@.category == 'Bakery')].costValue").value(0.0))
                .andExpect(jsonPath("$.stockByCategory[?(@.category == 'Bakery')].withoutCost").value(1));
    }
}
