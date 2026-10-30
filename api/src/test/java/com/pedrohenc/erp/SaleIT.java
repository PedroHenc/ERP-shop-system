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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Sales behind the real HTTP stack and PostgreSQL: pricing, numbering, stock exits, cancellation,
 * roles, store isolation and concurrent sales. Skipped when Docker is not available.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class SaleIT {

    private static final String PREFIX = "Sale IT";
    private static final String PASSWORD = "sale-pass-1";

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

    private long coffee;
    private long granola;
    private long tea;
    private long otherStoreProduct;

    @BeforeEach
    void seed() {
        cleanUp();
        long storeA = storeRepository.save(TbStore.builder().name(PREFIX + " A").build()).getId();
        long storeB = storeRepository.save(TbStore.builder().name(PREFIX + " B").build()).getId();
        user(storeA, "cashier@sale.test", UserRole.CASHIER);
        user(storeA, "manager@sale.test", UserRole.MANAGER);
        user(storeA, "stock@sale.test", UserRole.STOCK);
        user(storeB, "other@sale.test", UserRole.ADMIN);
        coffee = product(storeA, "SALE-1", "Coffee", "19.90", "10", UnitOfMeasure.UNIT, true);
        granola = product(storeA, "SALE-2", "Granola", "30.00", "5.5", UnitOfMeasure.KILOGRAM, true);
        tea = product(storeA, "SALE-3", "Old tea", "8.00", "20", UnitOfMeasure.UNIT, false);
        otherStoreProduct = product(storeB, "SALE-9", "Elsewhere", "1.00", "100", UnitOfMeasure.UNIT, true);
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
        userRepository.save(TbUser.builder().storeId(storeId).name(role + " of " + storeId).email(email)
                .passwordHash(passwordEncoder.encode(PASSWORD)).role(role).active(true).build());
    }

    private long product(long storeId, String sku, String name, String price, String stock, UnitOfMeasure unit, boolean active) {
        return productRepository.save(TbProduct.builder().storeId(storeId).sku(sku).name(name).category("Food")
                .price(new BigDecimal(price)).stockQuantity(new BigDecimal(stock)).unitOfMeasure(unit).active(active).build()).getId();
    }

    private String bearerOf(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk()).andReturn();
        return "Bearer " + JsonPath.<String>read(result.getResponse().getContentAsString(), "$.accessToken");
    }

    private MvcResult sell(String bearer, String body) throws Exception {
        return mockMvc.perform(post("/sales").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON).content(body))
                .andReturn();
    }

    private BigDecimal stock(long productId) {
        return jdbcTemplate.queryForObject("select stock_quantity from shop_api.tb_products where id = ?", BigDecimal.class, productId);
    }

    private static String body(MvcResult result) throws Exception {
        return result.getResponse().getContentAsString();
    }

    @Test
    void aCashierSellsAtTheCurrentPricesAndTheStockGoesOut() throws Exception {
        String cashier = bearerOf("cashier@sale.test");
        // Coffee scanned twice (one line of 3), 1.5 kg of granola, 2.00 off the coffee, 5.00 off the sale, paid 100 in cash.
        MvcResult first = sell(cashier, """
                {"items":[{"productId":%d,"quantity":2,"discount":2},{"productId":%d,"quantity":1.5},{"productId":%d,"quantity":1}],
                 "discount":5,"paymentMethod":"CASH","amountPaid":100}""".formatted(coffee, granola, coffee));

        assertThat(first.getResponse().getStatus()).isEqualTo(201);
        String sale = body(first);
        assertThat(JsonPath.<Integer>read(sale, "$.number")).isEqualTo(1);
        assertThat(JsonPath.<List<?>>read(sale, "$.items")).hasSize(2);
        // 3 × 19.90 = 59.70; 1.5 × 30.00 = 45.00; 104.70 − 2.00 − 5.00 = 97.70; change 2.30
        assertThat(JsonPath.<Double>read(sale, "$.subtotal")).isEqualTo(104.70);
        assertThat(JsonPath.<Double>read(sale, "$.itemsDiscount")).isEqualTo(2.0);
        assertThat(JsonPath.<Double>read(sale, "$.total")).isEqualTo(97.70);
        assertThat(JsonPath.<Double>read(sale, "$.change")).isEqualTo(2.30);
        assertThat(JsonPath.<String>read(sale, "$.items[0].name")).isEqualTo("Coffee");
        assertThat(JsonPath.<Double>read(sale, "$.items[0].total")).isEqualTo(57.70);
        assertThat(stock(coffee)).isEqualByComparingTo("7");
        assertThat(stock(granola)).isEqualByComparingTo("4");
        List<Map<String, Object>> exits = jdbcTemplate.queryForList(
                "select type, reason, quantity, note from shop_api.tb_stock_movements where sale_id = ? order by product_id",
                ((Number) JsonPath.read(sale, "$.id")).longValue());
        assertThat(exits).extracting(row -> row.get("reason")).containsOnly("SALE");
        assertThat(exits).extracting(row -> row.get("note")).containsOnly("Sale #1");

        MvcResult second = sell(cashier, """
                {"items":[{"productId":%d,"quantity":1}],"paymentMethod":"PIX","amountPaid":999}""".formatted(coffee));
        assertThat(JsonPath.<Integer>read(body(second), "$.number")).isEqualTo(2);
        // Only cash has change: the amount paid is the total.
        assertThat(JsonPath.<Double>read(body(second), "$.amountPaid")).isEqualTo(19.90);
        assertThat(JsonPath.<Double>read(body(second), "$.change")).isEqualTo(0.0);
    }

    @Test
    void refusesWhatCannotBeSoldAndChangesNothing() throws Exception {
        String cashier = bearerOf("cashier@sale.test");
        String[][] cases = {
                {"{\"items\":[{\"productId\":%d,\"quantity\":11}],\"paymentMethod\":\"PIX\"}".formatted(coffee), "items", "Not enough stock of Coffee: 10 available"},
                {"{\"items\":[{\"productId\":%d,\"quantity\":1.5}],\"paymentMethod\":\"PIX\"}".formatted(coffee), "items", "Coffee is sold in whole units"},
                {"{\"items\":[{\"productId\":%d,\"quantity\":1}],\"paymentMethod\":\"PIX\"}".formatted(tea), "items", "Old tea is inactive and cannot be sold"},
                {"{\"items\":[{\"productId\":%d,\"quantity\":1}],\"paymentMethod\":\"PIX\"}".formatted(otherStoreProduct), "items", "A product of this sale no longer exists"},
                {"{\"items\":[{\"productId\":%d,\"quantity\":1}],\"paymentMethod\":\"CASH\",\"amountPaid\":10}".formatted(coffee), "amountPaid", "The amount received is less than the total"},
                {"{\"items\":[{\"productId\":%d,\"quantity\":1}],\"discount\":20,\"paymentMethod\":\"PIX\"}".formatted(coffee), "discount", "The discount is larger than the sale"},
                {"{\"items\":[{\"productId\":%d,\"quantity\":1,\"discount\":20}],\"paymentMethod\":\"PIX\"}".formatted(coffee), "items", "The discount on Coffee is larger than its price"},
        };
        for (String[] c : cases) {
            MvcResult result = sell(cashier, c[0]);
            assertThat(result.getResponse().getStatus()).as(c[2]).isEqualTo(400);
            assertThat(JsonPath.<String>read(body(result), "$.errors." + c[1])).isEqualTo(c[2]);
        }
        assertThat(sell(cashier, "{\"items\":[],\"paymentMethod\":\"PIX\"}").getResponse().getStatus()).isEqualTo(400);
        assertThat(stock(coffee)).isEqualByComparingTo("10");
        assertThat(jdbcTemplate.queryForObject("select count(*) from shop_api.tb_sales where store_id in "
                + "(select id from shop_api.tb_stores where name like '" + PREFIX + "%')", Long.class)).isZero();
    }

    @Test
    void aManagerCancelsASaleAndTheStockComesBack() throws Exception {
        MvcResult sale = sell(bearerOf("cashier@sale.test"), """
                {"items":[{"productId":%d,"quantity":4}],"paymentMethod":"DEBIT_CARD"}""".formatted(coffee));
        long id = ((Number) JsonPath.read(body(sale), "$.id")).longValue();
        assertThat(stock(coffee)).isEqualByComparingTo("6");
        String cancel = "{\"reason\":\"Customer gave up\"}";

        mockMvc.perform(post("/sales/" + id + "/cancel").header("Authorization", bearerOf("cashier@sale.test"))
                        .contentType(MediaType.APPLICATION_JSON).content(cancel))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/sales/" + id + "/cancel").header("Authorization", bearerOf("manager@sale.test"))
                        .contentType(MediaType.APPLICATION_JSON).content(cancel))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.cancelReason").value("Customer gave up"))
                .andExpect(jsonPath("$.cancelledByName").exists());
        assertThat(stock(coffee)).isEqualByComparingTo("10");
        assertThat(jdbcTemplate.queryForObject("select reason from shop_api.tb_stock_movements where sale_id = ? and quantity > 0",
                String.class, id)).isEqualTo("CUSTOMER_RETURN");

        mockMvc.perform(post("/sales/" + id + "/cancel").header("Authorization", bearerOf("manager@sale.test"))
                        .contentType(MediaType.APPLICATION_JSON).content(cancel))
                .andExpect(status().isBadRequest());
        assertThat(stock(coffee)).isEqualByComparingTo("10");
    }

    @Test
    void salesStayInsideTheStoreAndTheStockTeamCannotSell() throws Exception {
        MvcResult sale = sell(bearerOf("cashier@sale.test"), """
                {"items":[{"productId":%d,"quantity":1}],"paymentMethod":"PIX"}""".formatted(coffee));
        long id = ((Number) JsonPath.read(body(sale), "$.id")).longValue();
        String other = bearerOf("other@sale.test");

        mockMvc.perform(get("/sales/" + id).header("Authorization", other)).andExpect(status().isNotFound());
        mockMvc.perform(get("/sales/page").header("Authorization", other)).andExpect(jsonPath("$.totalElements").value(0));
        mockMvc.perform(get("/sales/page").header("Authorization", bearerOf("manager@sale.test")))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].itemCount").value(1));
        assertThat(sell(bearerOf("stock@sale.test"), "{\"items\":[{\"productId\":%d,\"quantity\":1}],\"paymentMethod\":\"PIX\"}"
                .formatted(coffee)).getResponse().getStatus()).isEqualTo(403);
    }

    @Test
    void theSearchFindsProductsByNameSkuOrExactBarcode() throws Exception {
        jdbcTemplate.update("update shop_api.tb_products set barcode = '7891234567895' where id = ?", coffee);
        String cashier = bearerOf("cashier@sale.test");
        for (String term : new String[]{"coff", "SALE-1", "7891234567895"}) {
            mockMvc.perform(get("/products/page").param("search", term).param("active", "true").header("Authorization", cashier))
                    .andExpect(jsonPath("$.totalElements").value(1))
                    .andExpect(jsonPath("$.content[0].name").value("Coffee"));
        }
        mockMvc.perform(get("/products/page").param("search", "789123").header("Authorization", cashier))
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void concurrentSalesNeverOversellAndGetDistinctNumbers() throws Exception {
        String cashier = bearerOf("cashier@sale.test");
        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            List<Callable<MvcResult>> sales = new ArrayList<>();
            for (int i = 0; i < 13; i++) {
                sales.add(() -> sell(cashier, "{\"items\":[{\"productId\":%d,\"quantity\":1},{\"productId\":%d,\"quantity\":0.1}],\"paymentMethod\":\"PIX\"}"
                        .formatted(coffee, granola)));
            }
            List<Integer> numbers = new ArrayList<>();
            int refused = 0;
            for (Future<MvcResult> future : pool.invokeAll(sales)) {
                MvcResult result = future.get();
                if (result.getResponse().getStatus() == 201) {
                    numbers.add(JsonPath.read(body(result), "$.number"));
                } else {
                    assertThat(result.getResponse().getStatus()).isEqualTo(400);
                    refused++;
                }
            }
            assertThat(numbers).hasSize(10).doesNotHaveDuplicates().allMatch(n -> n >= 1 && n <= 10);
            assertThat(refused).isEqualTo(3);
            assertThat(stock(coffee)).isEqualByComparingTo("0");
            assertThat(stock(granola)).isEqualByComparingTo("4.5");
        } finally {
            pool.shutdownNow();
        }
    }
}
