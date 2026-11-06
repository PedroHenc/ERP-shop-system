package com.pedrohenc.erp;

import com.jayway.jsonpath.JsonPath;
import com.pedrohenc.erp.entity.TbProduct;
import com.pedrohenc.erp.entity.TbStore;
import com.pedrohenc.erp.entity.TbSupplier;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UnitOfMeasure;
import com.pedrohenc.erp.entity.UserRole;
import com.pedrohenc.erp.repository.ProductRepository;
import com.pedrohenc.erp.repository.StoreRepository;
import com.pedrohenc.erp.repository.SupplierRepository;
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
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Purchase orders end to end: draft, edit, send and receive into stock with the weighted average cost,
 * who may do what, the state rules, and the reorder suggestions that count what is already on order.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class PurchaseOrderIT {

    private static final String PREFIX = "Purchase IT";
    private static final String PASSWORD = "purchase-pass-1";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private StoreRepository storeRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private SupplierRepository supplierRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    private String manager;
    private String stock;
    private long supplier;
    private long coffee;
    private long tea;
    private long rice;

    @BeforeEach
    void seed() throws Exception {
        cleanUp();
        long store = storeRepository.save(TbStore.builder().name(PREFIX).build()).getId();
        user(store, "manager@purchase.test", UserRole.MANAGER);
        user(store, "stock@purchase.test", UserRole.STOCK);
        user(store, "cashier@purchase.test", UserRole.CASHIER);
        supplier = supplierRepository.save(TbSupplier.builder().storeId(store).legalName("Distribuidora Ltda")
                .tradeName("Distri").taxId("PURCHASETAX1").active(true).build()).getId();
        // Coffee: 10 on hand at 6.00, reorder at 5 (fine). Tea: 2 on hand, no cost, reorder at 4 (low).
        coffee = product(store, "PO-1", "Coffee", "10", "6.00", "5", UnitOfMeasure.UNIT);
        tea = product(store, "PO-2", "Tea", "2", null, "4", UnitOfMeasure.UNIT);
        rice = product(store, "PO-3", "Rice", "1.5", "4.00", "3", UnitOfMeasure.KILOGRAM);
        manager = bearerOf("manager@purchase.test");
        stock = bearerOf("stock@purchase.test");
    }

    @AfterEach
    void cleanUp() {
        SecurityContextHolder.clearContext();
        String stores = "(select id from shop_api.tb_stores where name like '" + PREFIX + "%')";
        jdbcTemplate.update("delete from shop_api.tb_refresh_tokens where user_id in "
                + "(select id from shop_api.tb_users where store_id in " + stores + ")");
        jdbcTemplate.update("delete from shop_api.tb_stock_movements where store_id in " + stores);
        jdbcTemplate.update("delete from shop_api.tb_purchase_orders where store_id in " + stores);
        jdbcTemplate.update("delete from shop_api.tb_products where store_id in " + stores);
        jdbcTemplate.update("delete from shop_api.tb_suppliers where store_id in " + stores);
        jdbcTemplate.update("delete from shop_api.tb_users where store_id in " + stores);
        jdbcTemplate.update("delete from shop_api.tb_stores where name like '" + PREFIX + "%'");
    }

    private void user(long storeId, String email, UserRole role) {
        userRepository.save(TbUser.builder().storeId(storeId).name(role.name()).email(email)
                .passwordHash(passwordEncoder.encode(PASSWORD)).role(role).active(true).build());
    }

    private long product(long storeId, String sku, String name, String stockQuantity, String cost, String reorderPoint,
                         UnitOfMeasure unit) {
        return productRepository.save(TbProduct.builder().storeId(storeId).sku(sku).name(name).category("Food")
                .price(new BigDecimal("12.00")).costPrice(cost == null ? null : new BigDecimal(cost))
                .stockQuantity(new BigDecimal(stockQuantity)).reorderPoint(new BigDecimal(reorderPoint))
                .unitOfMeasure(unit).build()).getId();
    }

    private String bearerOf(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk()).andReturn();
        return "Bearer " + JsonPath.<String>read(result.getResponse().getContentAsString(), "$.accessToken");
    }

    private String order(String... lines) {
        return "{\"supplierId\":%d,\"notes\":\"Weekly\",\"items\":[%s]}".formatted(supplier, String.join(",", lines));
    }

    private static String line(long productId, String quantity, String cost) {
        return "{\"productId\":%d,\"quantity\":%s,\"unitCost\":%s}".formatted(productId, quantity, cost);
    }

    private MvcResult send(String method, String url, String bearer, String body) throws Exception {
        var builder = switch (method) {
            case "PUT" -> put(url);
            default -> post(url);
        };
        builder.header("Authorization", bearer);
        if (body != null) {
            builder.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return mockMvc.perform(builder).andReturn();
    }

    private long create(String body) throws Exception {
        MvcResult result = send("POST", "/purchase-orders", manager, body);
        assertThat(result.getResponse().getStatus()).isEqualTo(201);
        return ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    /** The receive body for an order: [productId → (quantity, cost)] mapped onto its item ids. */
    private String arrival(long orderId, Map<Long, String[]> byProduct) throws Exception {
        String body = mockMvc.perform(get("/purchase-orders/" + orderId).header("Authorization", stock))
                .andReturn().getResponse().getContentAsString();
        List<Map<String, Object>> items = JsonPath.read(body, "$.items");
        StringBuilder json = new StringBuilder("{\"items\":[");
        for (int i = 0; i < items.size(); i++) {
            Map<String, Object> item = items.get(i);
            String[] value = byProduct.get(((Number) item.get("productId")).longValue());
            json.append(i > 0 ? "," : "").append("{\"itemId\":%d,\"receivedQuantity\":%s,\"unitCost\":%s}"
                    .formatted(((Number) item.get("id")).longValue(), value[0], value[1]));
        }
        return json.append("]}").toString();
    }

    private BigDecimal column(String column, long productId) {
        return jdbcTemplate.queryForObject("select " + column + " from shop_api.tb_products where id = ?", BigDecimal.class, productId);
    }

    @Test
    void aDraftIsEditedSentAndReceivedIntoStockAtTheAverageCost() throws Exception {
        long id = create(order(line(coffee, "10", "8.00"), line(tea, "5", "3.00")));
        mockMvc.perform(get("/purchase-orders/" + id).header("Authorization", manager))
                .andExpect(jsonPath("$.number").value(1))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.supplierName").value("Distri"))
                .andExpect(jsonPath("$.total").value(95.0));

        // Edit the draft: 8 coffees instead of 10.
        MvcResult edited = send("PUT", "/purchase-orders/" + id, manager, order(line(coffee, "8", "8.00"), line(tea, "5", "3.00")));
        assertThat(edited.getResponse().getStatus()).isEqualTo(200);
        assertThat(JsonPath.<Double>read(edited.getResponse().getContentAsString(), "$.total")).isEqualTo(79.0);

        assertThat(send("POST", "/purchase-orders/" + id + "/send", manager, null).getResponse().getStatus()).isEqualTo(200);
        // Sent: no more edits.
        assertThat(send("PUT", "/purchase-orders/" + id, manager, order(line(coffee, "1", "8.00"))).getResponse().getStatus())
                .isEqualTo(400);

        // The stock team receives: coffee came at 9.00 instead of 8.00; all the tea arrived.
        MvcResult received = send("POST", "/purchase-orders/" + id + "/receive", stock,
                arrival(id, Map.of(coffee, new String[]{"8", "9.00"}, tea, new String[]{"5", "3.00"})));
        assertThat(received.getResponse().getStatus()).isEqualTo(200);
        String body = received.getResponse().getContentAsString();
        assertThat(JsonPath.<String>read(body, "$.status")).isEqualTo("RECEIVED");
        assertThat(JsonPath.<Double>read(body, "$.receivedTotal")).isEqualTo(87.0);
        assertThat(JsonPath.<String>read(body, "$.receivedByName")).isEqualTo("STOCK");

        assertThat(column("stock_quantity", coffee)).isEqualByComparingTo("18");
        assertThat(column("stock_quantity", tea)).isEqualByComparingTo("7");
        // (10 × 6.00 + 8 × 9.00) ÷ 18 = 7.33; tea had no cost: it takes the one paid.
        assertThat(column("cost_price", coffee)).isEqualByComparingTo("7.33");
        assertThat(column("cost_price", tea)).isEqualByComparingTo("3.00");
        // The response already shows the new values.
        assertThat(JsonPath.<List<Double>>read(body, "$.items[?(@.sku == 'PO-1')].productCost")).containsExactly(7.33);
        assertThat(jdbcTemplate.queryForObject("select count(*) from shop_api.tb_stock_movements where product_id = ? "
                + "and reason = 'PURCHASE' and note = 'Purchase order #1' and quantity = 8", Long.class, coffee)).isEqualTo(1);

        // Received once only.
        assertThat(send("POST", "/purchase-orders/" + id + "/receive", stock,
                arrival(id, Map.of(coffee, new String[]{"1", "9.00"}, tea, new String[]{"1", "3.00"}))).getResponse().getStatus())
                .isEqualTo(400);
    }

    @Test
    void aNewCostBumpsTheProductVersionSoAnOpenFormDoesNotWriteTheOldOneBack() throws Exception {
        Long version = jdbcTemplate.queryForObject("select version from shop_api.tb_products where id = ?", Long.class, coffee);
        long id = create(order(line(coffee, "10", "8.00")));
        send("POST", "/purchase-orders/" + id + "/receive", stock, arrival(id, Map.of(coffee, new String[]{"10", "8.00"})));
        assertThat(jdbcTemplate.queryForObject("select version from shop_api.tb_products where id = ?", Long.class, coffee))
                .isGreaterThan(version);
    }

    @Test
    void costsCanBeLeftAsTheyAreAndNothingArrivedIsAllowed() throws Exception {
        long id = create(order(line(coffee, "10", "8.00"), line(tea, "5", "3.00")));
        String body = arrival(id, Map.of(coffee, new String[]{"10", "8.00"}, tea, new String[]{"0", "3.00"}));
        body = body.substring(0, body.length() - 1) + ",\"updateCosts\":false}";
        assertThat(send("POST", "/purchase-orders/" + id + "/receive", stock, body).getResponse().getStatus()).isEqualTo(200);
        assertThat(column("cost_price", coffee)).isEqualByComparingTo("6.00");
        assertThat(column("stock_quantity", coffee)).isEqualByComparingTo("20");
        assertThat(column("stock_quantity", tea)).isEqualByComparingTo("2");
    }

    @Test
    void rolesAndRules() throws Exception {
        // The stock team reads and receives but does not create; cashiers see nothing.
        assertThat(send("POST", "/purchase-orders", stock, order(line(coffee, "1", "1"))).getResponse().getStatus()).isEqualTo(403);
        assertThat(mockMvc.perform(get("/purchase-orders/page").header("Authorization", bearerOf("cashier@purchase.test")))
                .andReturn().getResponse().getStatus()).isEqualTo(403);

        // Each product once; whole units for countable products.
        MvcResult duplicate = send("POST", "/purchase-orders", manager, order(line(coffee, "1", "1"), line(coffee, "2", "1")));
        assertThat(duplicate.getResponse().getStatus()).isEqualTo(400);
        assertThat(send("POST", "/purchase-orders", manager, order(line(coffee, "1.5", "1"))).getResponse().getStatus()).isEqualTo(400);
        // Kilograms can be fractional.
        long id = create(order(line(rice, "2.5", "4.20"), line(coffee, "3", "8.00")));

        // Receiving must say what arrived for every item.
        String partial = arrival(id, Map.of(rice, new String[]{"2.5", "4.20"}, coffee, new String[]{"3", "8.00"}));
        partial = partial.replaceFirst("\\{\"itemId\":\\d+,\"receivedQuantity\":[^}]+},", "");
        assertThat(send("POST", "/purchase-orders/" + id + "/receive", stock, partial).getResponse().getStatus()).isEqualTo(400);

        // Cancelled: no receiving.
        assertThat(send("POST", "/purchase-orders/" + id + "/cancel", manager, null).getResponse().getStatus()).isEqualTo(200);
        assertThat(send("POST", "/purchase-orders/" + id + "/receive", stock,
                arrival(id, Map.of(rice, new String[]{"1", "4.20"}, coffee, new String[]{"1", "8.00"}))).getResponse().getStatus())
                .isEqualTo(400);
        assertThat(column("stock_quantity", rice)).isEqualByComparingTo("1.5");

        mockMvc.perform(get("/purchase-orders/page").header("Authorization", stock).param("status", "CANCELLED"))
                .andExpect(jsonPath("$.content[0].number").value(1))
                .andExpect(jsonPath("$.content[0].items").value(2));
    }

    @Test
    void suggestionsRefillToTwiceTheReorderPointMinusWhatIsAlreadyOnOrder() throws Exception {
        // Tea: 2 on hand, reorder at 4 → 6 to reach 8. Rice: 1.5 kg, reorder at 3 → 4.5 kg. Coffee is fine.
        mockMvc.perform(get("/purchase-orders/suggestions").header("Authorization", stock))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[?(@.sku == 'PO-2')].suggestedQuantity").value(6))
                .andExpect(jsonPath("$[?(@.sku == 'PO-3')].suggestedQuantity").value(4.5));

        create(order(line(tea, "4", "3.00")));
        mockMvc.perform(get("/purchase-orders/suggestions").header("Authorization", stock))
                .andExpect(jsonPath("$[?(@.sku == 'PO-2')].onOrder").value(4.0))
                .andExpect(jsonPath("$[?(@.sku == 'PO-2')].suggestedQuantity").value(2));
    }
}
