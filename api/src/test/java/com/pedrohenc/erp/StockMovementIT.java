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
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Stock movements behind the real HTTP stack and PostgreSQL: balances, history, the product's
 * version, store isolation and concurrent exits. Skipped when Docker is not available.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class StockMovementIT {

    private static final String PREFIX = "Stock IT";
    private static final String PASSWORD = "stock-pass-1";

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

    private String bearerA;
    private String bearerB;
    private long productId;

    @BeforeEach
    void seed() throws Exception {
        cleanUp();
        long storeA = seedStore(PREFIX + " A", "a@stock.test");
        seedStore(PREFIX + " B", "b@stock.test");
        productId = productRepository.save(TbProduct.builder()
                .storeId(storeA).sku("STK-1").name("Granola").category("Food")
                .price(new BigDecimal("9.90")).stockQuantity(new BigDecimal("10.000"))
                .build()).getId();
        bearerA = bearerOf("a@stock.test");
        bearerB = bearerOf("b@stock.test");
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

    private long seedStore(String name, String email) {
        long storeId = storeRepository.save(TbStore.builder().name(name).build()).getId();
        userRepository.save(TbUser.builder().storeId(storeId).name("Admin " + name).email(email)
                .passwordHash(passwordEncoder.encode(PASSWORD)).role(UserRole.ADMIN).active(true).build());
        return storeId;
    }

    private String bearerOf(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk()).andReturn();
        return "Bearer " + JsonPath.<String>read(result.getResponse().getContentAsString(), "$.accessToken");
    }

    private MvcResult move(String bearer, long id, String type, String reason, String quantity) throws Exception {
        return mockMvc.perform(post("/products/" + id + "/stock-movements").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"%s\",\"reason\":\"%s\",\"quantity\":%s}".formatted(type, reason, quantity)))
                .andReturn();
    }

    private BigDecimal stock() {
        return jdbcTemplate.queryForObject("select stock_quantity from shop_api.tb_products where id = ?", BigDecimal.class, productId);
    }

    @Test
    void movementsChangeTheStockAndBuildTheHistoryWithoutBumpingTheProductVersion() throws Exception {
        Long version = jdbcTemplate.queryForObject("select version from shop_api.tb_products where id = ?", Long.class, productId);

        assertThat(move(bearerA, productId, "ENTRY", "PURCHASE", "5").getResponse().getStatus()).isEqualTo(201);
        assertThat(move(bearerA, productId, "EXIT", "LOSS", "2").getResponse().getStatus()).isEqualTo(201);
        assertThat(move(bearerA, productId, "ADJUSTMENT", "INVENTORY_COUNT", "12.5").getResponse().getStatus()).isEqualTo(201);

        assertThat(stock()).isEqualByComparingTo("12.5");
        assertThat(jdbcTemplate.queryForObject("select version from shop_api.tb_products where id = ?", Long.class, productId))
                .isEqualTo(version);
        mockMvc.perform(get("/stock-movements/page").param("productId", String.valueOf(productId)).header("Authorization", bearerA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.content[0].type").value("ADJUSTMENT"))
                .andExpect(jsonPath("$.content[0].quantity").value(-0.5))
                .andExpect(jsonPath("$.content[0].balanceAfter").value(12.5))
                .andExpect(jsonPath("$.content[0].createdByName").value("Admin " + PREFIX + " A"))
                .andExpect(jsonPath("$.content[2].quantity").value(5));
    }

    @Test
    void anExitBeyondTheStockIsRefusedAndChangesNothing() throws Exception {
        MvcResult result = move(bearerA, productId, "EXIT", "SALE", "11");

        assertThat(result.getResponse().getStatus()).isEqualTo(400);
        assertThat(JsonPath.<String>read(result.getResponse().getContentAsString(), "$.errors.quantity"))
                .isEqualTo("Not enough stock: 10 available");
        assertThat(stock()).isEqualByComparingTo("10");
    }

    @Test
    void creatingAProductWithStockRecordsItsInitialMovementAndEditingKeepsTheStock() throws Exception {
        String body = """
                {"sku":"STK-2","name":"Mel","category":"Food","price":12,"unitOfMeasure":"UNIT",
                "stockQuantity":%s,"minimumStock":0,"reorderPoint":0,"allowNegativeStock":false,"active":true}""";
        MvcResult created = mockMvc.perform(post("/products").header("Authorization", bearerA)
                        .contentType(MediaType.APPLICATION_JSON).content(body.formatted("4")))
                .andExpect(status().isCreated()).andReturn();
        long id = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();

        mockMvc.perform(get("/stock-movements/page").param("productId", String.valueOf(id)).header("Authorization", bearerA))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].type").value("INITIAL"))
                .andExpect(jsonPath("$.content[0].balanceAfter").value(4));

        mockMvc.perform(put("/products/" + id).header("Authorization", bearerA)
                        .contentType(MediaType.APPLICATION_JSON).content(body.formatted("99")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stockQuantity").value(4));
    }

    @Test
    void anotherStoreCannotMoveOrSeeTheStock() throws Exception {
        move(bearerA, productId, "ENTRY", "PURCHASE", "1");

        assertThat(move(bearerB, productId, "EXIT", "SALE", "1").getResponse().getStatus()).isEqualTo(404);
        mockMvc.perform(get("/stock-movements/page").header("Authorization", bearerB))
                .andExpect(jsonPath("$.totalElements").value(0));
        assertThat(stock()).isEqualByComparingTo("11");
    }

    @Test
    void concurrentExitsNeverSellMoreThanTheStock() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            List<Callable<Integer>> exits = new ArrayList<>();
            for (int i = 0; i < 14; i++) {
                exits.add(() -> move(bearerA, productId, "EXIT", "SALE", "1").getResponse().getStatus());
            }
            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> future : pool.invokeAll(exits)) {
                statuses.add(future.get());
            }

            assertThat(statuses).filteredOn(s -> s == 201).hasSize(10);
            assertThat(statuses).filteredOn(s -> s == 400).hasSize(4);
            assertThat(stock()).isEqualByComparingTo("0");
            assertThat(jdbcTemplate.queryForObject(
                    "select min(balance_after) from shop_api.tb_stock_movements where product_id = ?", BigDecimal.class, productId))
                    .isEqualByComparingTo("0");
        } finally {
            pool.shutdownNow();
        }
    }
}
