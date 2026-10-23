package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.config.SecurityConfig;
import com.pedrohenc.erp.dto.user.UserPageResponse;
import com.pedrohenc.erp.dto.user.UserResponse;
import com.pedrohenc.erp.entity.UserRole;
import com.pedrohenc.erp.security.JwtConfig;
import com.pedrohenc.erp.security.ProblemDetailAuthHandlers;
import com.pedrohenc.erp.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.endsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@Import({SecurityConfig.class, JwtConfig.class, ProblemDetailAuthHandlers.class})
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    private static RequestPostProcessor asRole(String role) {
        return jwt().jwt(j -> j.subject("1").claim("email", "a@x.com").claim("role", role))
                .authorities(new SimpleGrantedAuthority("ROLE_" + role));
    }

    private static UserResponse response() {
        return new UserResponse(7L, 0L, "Bob", "bob@x.com", UserRole.CASHIER, true, null,
                LocalDateTime.now(), LocalDateTime.now());
    }

    @Test
    void managerCannotListUsers() throws Exception {
        mockMvc.perform(get("/users/page").with(asRole("MANAGER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminListsUsers() throws Exception {
        when(userService.findPage(any())).thenReturn(new UserPageResponse(List.of(response()), 0, 20, 1, 1, true));

        mockMvc.perform(get("/users/page").with(asRole("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].email").value("bob@x.com"));
    }

    @Test
    void adminCreatesUser() throws Exception {
        when(userService.create(any())).thenReturn(response());

        mockMvc.perform(post("/users").with(asRole("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Bob\",\"email\":\"bob@x.com\",\"role\":\"CASHIER\",\"active\":true,\"password\":\"password123\"}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", endsWith("/users/7")))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void shortPasswordReturns400() throws Exception {
        mockMvc.perform(post("/users").with(asRole("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Bob\",\"email\":\"bob@x.com\",\"role\":\"CASHIER\",\"active\":true,\"password\":\"short\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.password").exists());
    }

    @Test
    void setPasswordReturns204() throws Exception {
        mockMvc.perform(post("/users/7/password").with(asRole("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"newpassword1\"}"))
                .andExpect(status().isNoContent());

        verify(userService).setPassword(7L, "newpassword1");
    }
}
