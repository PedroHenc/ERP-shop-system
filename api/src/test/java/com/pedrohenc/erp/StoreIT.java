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

import java.util.Base64;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The store's name and logo, as shown in the header: everyone reads its own store, admins change it. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class StoreIT {

    private static final String PREFIX = "Store IT";
    private static final String PASSWORD = "store-pass-1";
    private static final String PNG = "data:image/png;base64," + Base64.getEncoder().encodeToString(new byte[]{(byte) 0x89, 'P', 'N', 'G', 1, 2, 3});

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
        long store = storeRepository.save(TbStore.builder().name(PREFIX + " One").build()).getId();
        long other = storeRepository.save(TbStore.builder().name(PREFIX + " Two").build()).getId();
        user(store, "admin@store.test", UserRole.ADMIN);
        user(store, "cashier@store.test", UserRole.CASHIER);
        user(other, "admin2@store.test", UserRole.ADMIN);
    }

    @AfterEach
    void cleanUp() {
        SecurityContextHolder.clearContext();
        String stores = "(select id from shop_api.tb_stores where name like '" + PREFIX + "%')";
        jdbcTemplate.update("delete from shop_api.tb_refresh_tokens where user_id in "
                + "(select id from shop_api.tb_users where store_id in " + stores + ")");
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

    private static String body(String name, String logo) {
        return "{\"name\":\"" + name + "\",\"logo\":" + (logo == null ? "null" : "\"" + logo + "\"") + "}";
    }

    @Test
    void anAdminRenamesTheStoreAndSetsALogoThatEveryoneInItSees() throws Exception {
        String admin = bearerOf("admin@store.test");
        mockMvc.perform(get("/store").header("Authorization", admin))
                .andExpect(jsonPath("$.name").value(PREFIX + " One"))
                .andExpect(jsonPath("$.logo").doesNotExist());

        mockMvc.perform(put("/store").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content(body("  " + PREFIX + " Renamed  ", PNG)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(PREFIX + " Renamed"))
                .andExpect(jsonPath("$.logo").value(PNG));

        mockMvc.perform(get("/store").header("Authorization", bearerOf("cashier@store.test")))
                .andExpect(jsonPath("$.name").value(PREFIX + " Renamed"))
                .andExpect(jsonPath("$.logo").value(PNG));
        // Another store is untouched.
        mockMvc.perform(get("/store").header("Authorization", bearerOf("admin2@store.test")))
                .andExpect(jsonPath("$.name").value(PREFIX + " Two"))
                .andExpect(jsonPath("$.logo").doesNotExist());

        // A null logo removes it.
        mockMvc.perform(put("/store").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content(body(PREFIX + " Renamed", null)))
                .andExpect(jsonPath("$.logo").doesNotExist());
    }

    @Test
    void onlyAdminsChangeItAndOnlyWithAnImage() throws Exception {
        mockMvc.perform(put("/store").header("Authorization", bearerOf("cashier@store.test"))
                        .contentType(MediaType.APPLICATION_JSON).content(body(PREFIX + " X", null)))
                .andExpect(status().isForbidden());

        String admin = bearerOf("admin@store.test");
        mockMvc.perform(put("/store").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content(body(" ", null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.name").exists());
        mockMvc.perform(put("/store").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content(body(PREFIX + " X", "data:image/svg+xml;base64,PHN2Zz4=")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.logo").exists());
        mockMvc.perform(put("/store").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content(body(PREFIX + " X", "data:image/png;base64,***")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.logo").exists());
    }
}
