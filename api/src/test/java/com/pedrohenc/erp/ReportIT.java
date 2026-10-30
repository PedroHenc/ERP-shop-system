package com.pedrohenc.erp;

import com.jayway.jsonpath.JsonPath;
import com.pedrohenc.erp.entity.StockMovementReason;
import com.pedrohenc.erp.entity.StockMovementType;
import com.pedrohenc.erp.entity.TbProduct;
import com.pedrohenc.erp.entity.TbStockMovement;
import com.pedrohenc.erp.entity.TbStore;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UserRole;
import com.pedrohenc.erp.repository.ProductRepository;
import com.pedrohenc.erp.repository.StockMovementRepository;
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
import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The stock report over real data: totals, daily buckets in the user's time zone, top exits, losses,
 * reasons and the category snapshot, limited to the user's store. Skipped when Docker is not available.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class ReportIT {

    private static final String PREFIX = "Report IT";
    private static final String PASSWORD = "report-pass-1";
    /** 2026-10-10 00:00 in São Paulo (UTC−3) to 2026-10-13 00:00: three local days. */
    private static final String FROM = "2026-10-10T03:00:00Z";
    private static final String TO = "2026-10-13T03:00:00Z";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private StoreRepository storeRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private StockMovementRepository movementRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void seed() {
        cleanUp();
        long storeA = seedStore(PREFIX + " A", "a@report.test", UserRole.MANAGER);
        long storeB = seedStore(PREFIX + " B", "b@report.test", UserRole.ADMIN);
        seedStore(PREFIX + " C", "cashier@report.test", UserRole.CASHIER);

        TbProduct granola = product(storeA, "RPT-1", "Granola", "Food", "10.00", "20");
        TbProduct coffee = product(storeA, "RPT-2", "Coffee", "Drinks", "30.00", "5");
        product(storeA, "RPT-3", "Old tea", "Drinks", "8.00", "100", false);
        TbProduct other = product(storeB, "RPT-9", "Other store", "Food", "99.00", "1");

        // 10 Oct, local morning: 10 granola in (100). 11 Oct 01:00 UTC is still 10 Oct in São Paulo.
        move(granola, StockMovementType.ENTRY, StockMovementReason.PURCHASE, "10", "2026-10-10T12:00:00Z");
        move(coffee, StockMovementType.EXIT, StockMovementReason.SALE, "-2", "2026-10-11T01:00:00Z");
        // 11 Oct: sales and a loss; 12 Oct: a negative count.
        move(granola, StockMovementType.EXIT, StockMovementReason.SALE, "-4", "2026-10-11T15:00:00Z");
        move(granola, StockMovementType.EXIT, StockMovementReason.LOSS, "-1", "2026-10-11T16:00:00Z");
        move(coffee, StockMovementType.ADJUSTMENT, StockMovementReason.INVENTORY_COUNT, "-1", "2026-10-12T14:00:00Z");
        // Outside the period, and another store's: ignored.
        move(granola, StockMovementType.EXIT, StockMovementReason.SALE, "-9", "2026-10-13T04:00:00Z");
        move(other, StockMovementType.EXIT, StockMovementReason.SALE, "-1", "2026-10-11T15:00:00Z");
    }

    @AfterEach
    void cleanUp() {
        SecurityContextHolder.clearContext();
        String stores = "(select id from shop_api.tb_stores where name like '" + PREFIX + "%')";
        jdbcTemplate.update("delete from shop_api.tb_refresh_tokens where user_id in "
                + "(select id from shop_api.tb_users where store_id in " + stores + ")");
        jdbcTemplate.update("delete from shop_api.tb_products where store_id in " + stores);
        jdbcTemplate.update("delete from shop_api.tb_users where store_id in " + stores);
        jdbcTemplate.update("delete from shop_api.tb_stores where name like '" + PREFIX + "%'");
    }

    private long seedStore(String name, String email, UserRole role) {
        long storeId = storeRepository.save(TbStore.builder().name(name).build()).getId();
        userRepository.save(TbUser.builder().storeId(storeId).name("User " + name).email(email)
                .passwordHash(passwordEncoder.encode(PASSWORD)).role(role).active(true).build());
        return storeId;
    }

    private TbProduct product(long storeId, String sku, String name, String category, String price, String stock) {
        return product(storeId, sku, name, category, price, stock, true);
    }

    private TbProduct product(long storeId, String sku, String name, String category, String price, String stock, boolean active) {
        return productRepository.save(TbProduct.builder().storeId(storeId).sku(sku).name(name).category(category)
                .price(new BigDecimal(price)).stockQuantity(new BigDecimal(stock)).active(active).build());
    }

    private void move(TbProduct product, StockMovementType type, StockMovementReason reason, String quantity, String at) {
        movementRepository.save(TbStockMovement.builder().storeId(product.getStoreId()).product(product).type(type)
                .reason(reason).quantity(new BigDecimal(quantity)).balanceAfter(BigDecimal.ZERO)
                .createdAt(Instant.parse(at)).build());
    }

    private String bearerOf(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk()).andReturn();
        return "Bearer " + JsonPath.<String>read(result.getResponse().getContentAsString(), "$.accessToken");
    }

    @Test
    void summarisesThePeriodInTheUsersTimeZoneAndStore() throws Exception {
        mockMvc.perform(get("/reports/stock").header("Authorization", bearerOf("a@report.test"))
                        .param("from", FROM).param("to", TO).param("zone", "America/Sao_Paulo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totals.movements").value(5))
                .andExpect(jsonPath("$.totals.entries").value(1))
                .andExpect(jsonPath("$.totals.exits").value(3))
                .andExpect(jsonPath("$.totals.adjustments").value(1))
                .andExpect(jsonPath("$.totals.valueIn").value(100.0))
                // 2 coffee (60) + 4 granola (40) + 1 granola (10) + 1 coffee (30)
                .andExpect(jsonPath("$.totals.valueOut").value(140.0))
                .andExpect(jsonPath("$.daily.length()").value(3))
                .andExpect(jsonPath("$.daily[0].date").value("2026-10-10"))
                .andExpect(jsonPath("$.daily[0].valueIn").value(100.0))
                .andExpect(jsonPath("$.daily[0].valueOut").value(60.0))
                .andExpect(jsonPath("$.daily[1].valueOut").value(50.0))
                .andExpect(jsonPath("$.daily[2].date").value("2026-10-12"))
                .andExpect(jsonPath("$.daily[2].valueOut").value(30.0))
                .andExpect(jsonPath("$.topExits[0].name").value("Coffee"))
                .andExpect(jsonPath("$.topExits[0].value").value(60.0))
                .andExpect(jsonPath("$.topExits[1].name").value("Granola"))
                .andExpect(jsonPath("$.topExits[1].quantity").value(5.0))
                .andExpect(jsonPath("$.losses.length()").value(2))
                .andExpect(jsonPath("$.losses[0].name").value("Coffee"))
                .andExpect(jsonPath("$.losses[1].value").value(10.0))
                .andExpect(jsonPath("$.byReason[0].reason").value("SALE"))
                .andExpect(jsonPath("$.byReason[0].movements").value(2))
                // Today's stock of active products: food 20×10, drinks 5×30 (the inactive tea is left out).
                .andExpect(jsonPath("$.stockByCategory.length()").value(2))
                .andExpect(jsonPath("$.stockByCategory[0].category").value("Food"))
                .andExpect(jsonPath("$.stockByCategory[0].value").value(200.0))
                .andExpect(jsonPath("$.stockByCategory[1].products").value(1));
    }

    @Test
    void anotherStoreOnlySeesItsOwnActivity() throws Exception {
        mockMvc.perform(get("/reports/stock").header("Authorization", bearerOf("b@report.test"))
                        .param("from", FROM).param("to", TO))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totals.movements").value(1))
                .andExpect(jsonPath("$.topExits[0].name").value("Other store"));
    }

    @Test
    void cashiersCannotReadReports() throws Exception {
        mockMvc.perform(get("/reports/stock").header("Authorization", bearerOf("cashier@report.test"))
                        .param("from", FROM).param("to", TO))
                .andExpect(status().isForbidden());
    }

    @Test
    void rejectsInvalidPeriodsAndZones() throws Exception {
        String bearer = bearerOf("a@report.test");
        mockMvc.perform(get("/reports/stock").header("Authorization", bearer).param("from", TO).param("to", FROM))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.to").exists());
        mockMvc.perform(get("/reports/stock").header("Authorization", bearer)
                        .param("from", "2024-01-01T00:00:00Z").param("to", TO))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.from").exists());
        mockMvc.perform(get("/reports/stock").header("Authorization", bearer)
                        .param("from", FROM).param("to", TO).param("zone", "Mars/Olympus"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.zone").exists());
        mockMvc.perform(get("/reports/stock").header("Authorization", bearer))
                .andExpect(status().isBadRequest());
    }
}
