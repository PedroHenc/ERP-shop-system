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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Public account creation behind the real HTTP stack and PostgreSQL: a new store with its ADMIN, and
 * joining an existing store through an invite. Whatever is created stays inside its own store.
 * Skipped when Docker is not available.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class SignupIT {

    private static final String PREFIX = "Signup IT";
    private static final String HOST_STORE = PREFIX + " Host";
    private static final String OTHER_STORE = PREFIX + " Other";
    private static final String NEW_STORE = PREFIX + " New";
    private static final String PASSWORD = "signup-pass-1";

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

    private long hostStoreId;

    @BeforeEach
    void seed() {
        cleanUp();
        hostStoreId = seedStoreWithAdmin(HOST_STORE, "host-admin@signup.test");
        seedStoreWithAdmin(OTHER_STORE, "other-admin@signup.test");
    }

    @AfterEach
    void cleanUp() {
        SecurityContextHolder.clearContext();
        String stores = "(select id from shop_api.tb_stores where name like '" + PREFIX + "%')";
        jdbcTemplate.update("delete from shop_api.tb_invites where store_id in " + stores);
        jdbcTemplate.update("delete from shop_api.tb_refresh_tokens where user_id in "
                + "(select id from shop_api.tb_users where store_id in " + stores + ")");
        jdbcTemplate.update("delete from shop_api.tb_users where store_id in " + stores);
        jdbcTemplate.update("delete from shop_api.tb_stores where name like '" + PREFIX + "%'");
    }

    /** Root mode (no authentication): the user gets its store explicitly. */
    private long seedStoreWithAdmin(String storeName, String email) {
        long storeId = storeRepository.save(TbStore.builder().name(storeName).build()).getId();
        userRepository.save(TbUser.builder()
                .storeId(storeId)
                .name("Admin of " + storeName)
                .email(email)
                .passwordHash(passwordEncoder.encode(PASSWORD))
                .role(UserRole.ADMIN)
                .active(true)
                .build());
        return storeId;
    }

    private String bearer(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return "Bearer " + JsonPath.<String>read(result.getResponse().getContentAsString(), "$.accessToken");
    }

    private static String signupBody(String store, String name, String email) {
        return """
                {"storeName":"%s","name":"%s","email":"%s","password":"%s"}""".formatted(store, name, email, PASSWORD);
    }

    private static String acceptBody(String token, String name, String email) {
        return """
                {"token":"%s","name":"%s","email":"%s","password":"%s"}""".formatted(token, name, email, PASSWORD);
    }

    private String createInvite(String bearer, String role) throws Exception {
        MvcResult result = mockMvc.perform(post("/invites").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"" + role + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.invite.role").value(role))
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.token");
    }

    private List<String> userEmails(String bearer) throws Exception {
        String body = mockMvc.perform(get("/users/page").param("size", "100").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.content[*].email");
    }

    @Test
    void storeSignupCreatesAStoreWithItsAdminAndSignsIn() throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content(signupBody(NEW_STORE, "  Nova Dona  ", "Owner@Signup.TEST")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("ADMIN"))
                .andExpect(jsonPath("$.user.name").value("Nova Dona"))
                .andExpect(jsonPath("$.user.email").value("owner@signup.test"))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("erp_refresh=")))
                .andReturn();
        String bearer = "Bearer " + JsonPath.<String>read(result.getResponse().getContentAsString(), "$.accessToken");

        TbStore store = storeRepository.findAll().stream().filter(s -> s.getName().equals(NEW_STORE)).findFirst().orElseThrow();
        assertThat(store.getActive()).isTrue();
        // The new store starts empty and alone: its admin sees only themself.
        assertThat(userEmails(bearer)).containsExactly("owner@signup.test");
        mockMvc.perform(get("/dashboard/summary").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeProducts").value(0));
        // And the password works for a normal login.
        bearer("owner@signup.test");
    }

    @Test
    void storeSignupRejectsAnEmailUsedInAnyStore() throws Exception {
        mockMvc.perform(post("/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content(signupBody(NEW_STORE, "Someone", "HOST-ADMIN@signup.test")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").value("A user with this email already exists"));
        assertThat(storeRepository.findAll()).noneMatch(s -> s.getName().equals(NEW_STORE));
    }

    @Test
    void signedInRequestsCannotCreateAccounts() throws Exception {
        String bearer = bearer("host-admin@signup.test");
        mockMvc.perform(post("/auth/signup").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                        .content(signupBody(NEW_STORE, "Sneaky", "sneaky@signup.test")))
                .andExpect(status().isBadRequest());
        assertThat(userRepository.existsByEmailInAnyStore("sneaky@signup.test")).isFalse();
    }

    @Test
    void inviteLetsSomeoneJoinTheInvitingStoreWithTheInvitedRole() throws Exception {
        String hostBearer = bearer("host-admin@signup.test");
        String token = createInvite(hostBearer, "MANAGER");

        mockMvc.perform(post("/auth/invite/preview").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.storeName").value(HOST_STORE))
                .andExpect(jsonPath("$.role").value("MANAGER"));

        mockMvc.perform(post("/auth/invite/accept").contentType(MediaType.APPLICATION_JSON)
                        .content(acceptBody(token, "Gerente Novo", "manager@signup.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("MANAGER"))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("erp_refresh=")));

        assertThat(userRepository.findByEmail("manager@signup.test").orElseThrow().getStoreId()).isEqualTo(hostStoreId);
        assertThat(userEmails(hostBearer)).contains("manager@signup.test");
        assertThat(userEmails(bearer("other-admin@signup.test"))).doesNotContain("manager@signup.test");
        // Used up: it leaves the pending list and cannot be used again.
        mockMvc.perform(get("/invites").header("Authorization", hostBearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(post("/auth/invite/accept").contentType(MediaType.APPLICATION_JSON)
                        .content(acceptBody(token, "Second", "second@signup.test")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("invite-invalid"));
    }

    @Test
    void invitesStayInsideTheirStore() throws Exception {
        String hostBearer = bearer("host-admin@signup.test");
        createInvite(hostBearer, "CASHIER");
        long inviteId = jdbcTemplate.queryForObject(
                "select id from shop_api.tb_invites where store_id = ?", Long.class, hostStoreId);
        String otherBearer = bearer("other-admin@signup.test");

        mockMvc.perform(get("/invites").header("Authorization", otherBearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(delete("/invites/" + inviteId).header("Authorization", otherBearer))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/invites").header("Authorization", hostBearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].role").value("CASHIER"))
                .andExpect(jsonPath("$[0].createdByName").value("Admin of " + HOST_STORE))
                .andExpect(jsonPath("$[0].token").doesNotExist());
    }

    @Test
    void revokedExpiredOrSuspendedInvitesAreInvalid() throws Exception {
        String hostBearer = bearer("host-admin@signup.test");
        String revoked = createInvite(hostBearer, "STOCK");
        long revokedId = jdbcTemplate.queryForObject(
                "select id from shop_api.tb_invites where store_id = ? order by id desc limit 1", Long.class, hostStoreId);
        mockMvc.perform(delete("/invites/" + revokedId).header("Authorization", hostBearer)).andExpect(status().isNoContent());

        String expired = createInvite(hostBearer, "STOCK");
        jdbcTemplate.update("update shop_api.tb_invites set expires_at = now() - interval '1 minute' "
                + "where store_id = ? and revoked_at is null", hostStoreId);

        String suspended = createInvite(hostBearer, "STOCK");
        jdbcTemplate.update("update shop_api.tb_stores set active = false where id = ?", hostStoreId);

        for (String token : List.of(revoked, expired, suspended, "not-a-real-code")) {
            mockMvc.perform(post("/auth/invite/preview").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"token\":\"" + token + "\"}"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("invite-invalid"));
        }
        mockMvc.perform(post("/auth/invite/accept").contentType(MediaType.APPLICATION_JSON)
                        .content(acceptBody(suspended, "Late", "late@signup.test")))
                .andExpect(status().isNotFound());
        assertThat(userRepository.existsByEmailInAnyStore("late@signup.test")).isFalse();
    }

    @Test
    void onlyAdminsManageInvites() throws Exception {
        String hostBearer = bearer("host-admin@signup.test");
        String token = createInvite(hostBearer, "CASHIER");
        mockMvc.perform(post("/auth/invite/accept").contentType(MediaType.APPLICATION_JSON)
                        .content(acceptBody(token, "Caixa", "cashier@signup.test")))
                .andExpect(status().isOk());
        String cashierBearer = bearer("cashier@signup.test");

        mockMvc.perform(get("/invites").header("Authorization", cashierBearer)).andExpect(status().isForbidden());
        mockMvc.perform(post("/invites").header("Authorization", cashierBearer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isForbidden());
    }
}
