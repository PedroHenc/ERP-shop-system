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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The phone-to-screen barcode handoff behind the real HTTP stack and PostgreSQL: a signed-in screen
 * opens a session, an anonymous phone sends one code with the QR token, the screen polls it.
 * Skipped when Docker is not available.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class ScanSessionIT {

    private static final String PREFIX = "Scan IT";
    private static final String PASSWORD = "scan-pass-1";

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

    @BeforeEach
    void seed() {
        cleanUp();
        long store = storeRepository.save(TbStore.builder().name(PREFIX + " Store").build()).getId();
        user(store, "stock@scan.test", UserRole.STOCK);
        user(store, "manager@scan.test", UserRole.MANAGER);
        user(store, "cashier@scan.test", UserRole.CASHIER);
    }

    @AfterEach
    void cleanUp() {
        SecurityContextHolder.clearContext();
        String stores = "(select id from shop_api.tb_stores where name like '" + PREFIX + "%')";
        jdbcTemplate.update("delete from shop_api.tb_refresh_tokens where user_id in "
                + "(select id from shop_api.tb_users where store_id in " + stores + ")");
        jdbcTemplate.update("delete from shop_api.tb_scan_sessions where store_id in " + stores);
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

    private String[] open(String bearer) throws Exception {
        String body = mockMvc.perform(post("/scan-sessions").header("Authorization", bearer))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return new String[]{String.valueOf(((Number) JsonPath.read(body, "$.id")).longValue()), JsonPath.read(body, "$.token")};
    }

    private MvcResult submit(String token, String code) throws Exception {
        return mockMvc.perform(post("/scan/submit").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\",\"code\":\"" + code + "\"}")).andReturn();
    }

    @Test
    void aPhoneSendsTheCodeAndTheScreenGetsIt() throws Exception {
        String screen = bearerOf("stock@scan.test");
        String[] session = open(screen);

        mockMvc.perform(get("/scan-sessions/" + session[0]).header("Authorization", screen))
                .andExpect(jsonPath("$.status").value("WAITING"))
                .andExpect(jsonPath("$.code").doesNotExist());
        // The phone, not signed in.
        mockMvc.perform(post("/scan/preview").contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"" + session[1] + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.storeName").value(PREFIX + " Store"));
        assertThat(submit(session[1], " 7891234567895 ").getResponse().getStatus()).isEqualTo(204);

        mockMvc.perform(get("/scan-sessions/" + session[0]).header("Authorization", screen))
                .andExpect(jsonPath("$.status").value("SCANNED"))
                .andExpect(jsonPath("$.code").value("7891234567895"));
        // Single use: a second code, or a second look, is refused.
        assertThat(submit(session[1], "123").getResponse().getStatus()).isEqualTo(404);
        mockMvc.perform(post("/scan/preview").contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"" + session[1] + "\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("scan-invalid"));
        // Only the hash is stored.
        assertThat(jdbcTemplate.queryForObject("select count(*) from shop_api.tb_scan_sessions where token_hash = ?",
                Long.class, session[1])).isZero();
    }

    @Test
    void expiredAndUnknownTokensAreRefused() throws Exception {
        String screen = bearerOf("stock@scan.test");
        String[] session = open(screen);
        jdbcTemplate.update("update shop_api.tb_scan_sessions set expires_at = now() - interval '1 second' where id = ?",
                Long.parseLong(session[0]));

        assertThat(submit(session[1], "7891234567895").getResponse().getStatus()).isEqualTo(404);
        mockMvc.perform(get("/scan-sessions/" + session[0]).header("Authorization", screen))
                .andExpect(jsonPath("$.status").value("EXPIRED"));
        assertThat(submit("not-a-real-token-at-all", "7891234567895").getResponse().getStatus()).isEqualTo(404);
    }

    @Test
    void onlyItsOpenerPollsASessionAndCashiersCannotOpenOne() throws Exception {
        String[] session = open(bearerOf("stock@scan.test"));

        mockMvc.perform(get("/scan-sessions/" + session[0]).header("Authorization", bearerOf("manager@scan.test")))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/scan-sessions").header("Authorization", bearerOf("cashier@scan.test")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/scan-sessions/" + session[0])).andExpect(status().isUnauthorized());
    }

    @Test
    void codesMustLookLikeACode() throws Exception {
        String[] session = open(bearerOf("stock@scan.test"));

        assertThat(submit(session[1], "two words").getResponse().getStatus()).isEqualTo(400);
        assertThat(submit(session[1], "x".repeat(65)).getResponse().getStatus()).isEqualTo(400);
        assertThat(submit(session[1], "ABC-123").getResponse().getStatus()).isEqualTo(204);
    }
}
