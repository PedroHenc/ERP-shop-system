package com.pedrohenc.erp;

import com.jayway.jsonpath.JsonPath;
import com.pedrohenc.erp.entity.TbProduct;
import com.pedrohenc.erp.entity.TbStore;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UnitOfMeasure;
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
import java.time.Duration;
import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Sales totals and the sales report over sales made through the API: revenue after discounts, average
 * ticket, cancelled sales left out, best sellers, payment methods and roles. Skipped without Docker.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class SalesReportIT {

    private static final String PREFIX = "Sales Report IT";
    private static final String PASSWORD = "sales-report-1";

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

    private String from;
    private String to;

    @BeforeEach
    void seed() throws Exception {
        cleanUp();
        long store = storeRepository.save(TbStore.builder().name(PREFIX).build()).getId();
        user(store, "cashier@salesreport.test", UserRole.CASHIER);
        user(store, "manager@salesreport.test", UserRole.MANAGER);
        long coffee = product(store, "SR-1", "Coffee", "10.00");
        long tea = product(store, "SR-2", "Tea", "4.00");
        // The sales are made now: the period is the hour around it.
        from = Instant.now().minus(Duration.ofHours(1)).toString();
        to = Instant.now().plus(Duration.ofHours(1)).toString();

        String cashier = bearerOf("cashier@salesreport.test");
        // 3 coffee − 2.00 = 28.00 (cash); 2 tea + 1 coffee = 18.00 (pix); 5 tea = 20.00, cancelled.
        sell(cashier, "{\"items\":[{\"productId\":%d,\"quantity\":3}],\"discount\":2,\"paymentMethod\":\"CASH\",\"amountPaid\":30}".formatted(coffee));
        sell(cashier, "{\"items\":[{\"productId\":%d,\"quantity\":2},{\"productId\":%d,\"quantity\":1}],\"paymentMethod\":\"PIX\"}".formatted(tea, coffee));
        long cancelled = ((Number) JsonPath.read(sell(cashier, "{\"items\":[{\"productId\":%d,\"quantity\":5}],\"paymentMethod\":\"PIX\"}"
                .formatted(tea)), "$.id")).longValue();
        mockMvc.perform(post("/sales/" + cancelled + "/cancel").header("Authorization", bearerOf("manager@salesreport.test"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Wrong product\"}")).andExpect(status().isOk());
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

    private long product(long storeId, String sku, String name, String price) {
        return productRepository.save(TbProduct.builder().storeId(storeId).sku(sku).name(name).category("Drinks")
                .price(new BigDecimal(price)).stockQuantity(new BigDecimal("50")).unitOfMeasure(UnitOfMeasure.UNIT).build()).getId();
    }

    private String bearerOf(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk()).andReturn();
        return "Bearer " + JsonPath.<String>read(result.getResponse().getContentAsString(), "$.accessToken");
    }

    private String sell(String bearer, String body) throws Exception {
        return mockMvc.perform(post("/sales").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    }

    @Test
    void theSummaryCountsCompletedSalesForEveryoneWhoSells() throws Exception {
        mockMvc.perform(get("/sales/summary").header("Authorization", bearerOf("cashier@salesreport.test"))
                        .param("from", from).param("to", to))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sales").value(2))
                .andExpect(jsonPath("$.revenue").value(46.0))
                .andExpect(jsonPath("$.averageTicket").value(23.0))
                .andExpect(jsonPath("$.cancelled").value(1));
    }

    @Test
    void theReportShowsRevenueBestSellersAndPaymentMethodsToManagers() throws Exception {
        mockMvc.perform(get("/reports/sales").header("Authorization", bearerOf("manager@salesreport.test"))
                        .param("from", from).param("to", to).param("zone", "America/Sao_Paulo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totals.sales").value(2))
                .andExpect(jsonPath("$.totals.revenue").value(46.0))
                .andExpect(jsonPath("$.totals.discounts").value(2.0))
                .andExpect(jsonPath("$.totals.cancelled").value(1))
                .andExpect(jsonPath("$.daily[*].revenue").isArray())
                // Item values (the 2.00 discount was on the sale, not on an item): coffee 30 + 10 = 40.00 over 4 units;
                // tea 8.00 over 2 (the cancelled 5 are left out).
                .andExpect(jsonPath("$.topProducts[0].name").value("Coffee"))
                .andExpect(jsonPath("$.topProducts[0].quantity").value(4.0))
                .andExpect(jsonPath("$.topProducts[0].value").value(40.0))
                .andExpect(jsonPath("$.topProducts[1].name").value("Tea"))
                .andExpect(jsonPath("$.topProducts[1].quantity").value(2.0))
                .andExpect(jsonPath("$.byPayment[0].method").value("CASH"))
                .andExpect(jsonPath("$.byPayment[0].revenue").value(28.0))
                .andExpect(jsonPath("$.byPayment[1].method").value("PIX"))
                .andExpect(jsonPath("$.byPayment[1].sales").value(1));
    }

    @Test
    void cashiersCannotReadTheFullReport() throws Exception {
        mockMvc.perform(get("/reports/sales").header("Authorization", bearerOf("cashier@salesreport.test"))
                        .param("from", from).param("to", to))
                .andExpect(status().isForbidden());
    }
}
