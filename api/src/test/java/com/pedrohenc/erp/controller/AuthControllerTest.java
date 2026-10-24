package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.config.JwtProperties;
import com.pedrohenc.erp.config.SecurityConfig;
import com.pedrohenc.erp.dto.auth.AuthResponse;
import com.pedrohenc.erp.dto.user.UserResponse;
import com.pedrohenc.erp.entity.UserRole;
import com.pedrohenc.erp.exception.FieldErrorException;
import com.pedrohenc.erp.exception.InvalidCredentialsException;
import com.pedrohenc.erp.security.AuthService;
import com.pedrohenc.erp.security.JwtConfig;
import com.pedrohenc.erp.security.JwtService;
import com.pedrohenc.erp.security.ProblemDetailAuthHandlers;
import com.pedrohenc.erp.security.RefreshCookies;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtConfig.class, ProblemDetailAuthHandlers.class, RefreshCookies.class})
class AuthControllerTest {

    private static final String XRW = "X-Requested-With";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtEncoder jwtEncoder;

    @Autowired
    private JwtProperties jwtProperties;

    @MockitoBean
    private AuthService authService;

    private static UserResponse user(UserRole role) {
        return new UserResponse(1L, 0L, "Administrator", "admin@shop.com", role, true,
                Instant.parse("2026-10-23T12:00:00Z"), LocalDateTime.now(), LocalDateTime.now());
    }

    private static AuthService.LoginResult loginResult(String refresh) {
        return new AuthService.LoginResult(new AuthResponse("access-token", 900, user(UserRole.ADMIN)), refresh);
    }

    private static RequestPostProcessor asUser(long id, String role) {
        return jwt().jwt(j -> j.subject(String.valueOf(id)).claim("role", role))
                .authorities(new SimpleGrantedAuthority("ROLE_" + role));
    }

    @Test
    void loginReturnsTokenAndHttpOnlyCookie() throws Exception {
        when(authService.login("admin@shop.com", "secret-pass")).thenReturn(loginResult("raw-refresh"));

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@shop.com\",\"password\":\"secret-pass\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.expiresIn").value(900))
                .andExpect(jsonPath("$.user.email").value("admin@shop.com"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
                        containsString("erp_refresh=raw-refresh"),
                        containsString("HttpOnly"),
                        containsString("Path=/auth"),
                        containsString("Max-Age=604800"),
                        containsString("SameSite=Lax"))));
    }

    @Test
    void loginFailureReturns401Generic() throws Exception {
        when(authService.login(anyString(), anyString())).thenThrow(new InvalidCredentialsException());

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@shop.com\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid email or password"))
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));
    }

    @Test
    void loginWithBlankFieldsReturns400() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"\",\"password\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").exists())
                .andExpect(jsonPath("$.errors.password").exists());
    }

    @Test
    void refreshWithoutXRequestedWithReturns403() throws Exception {
        mockMvc.perform(post("/auth/refresh").cookie(new Cookie("erp_refresh", "raw")))
                .andExpect(status().isForbidden());

        verify(authService, never()).refresh(any());
    }

    @Test
    void refreshWithCookieReturnsNewTokenAndRotatesCookie() throws Exception {
        when(authService.refresh("old-raw")).thenReturn(loginResult("new-raw"));

        mockMvc.perform(post("/auth/refresh").header(XRW, "XMLHttpRequest")
                        .cookie(new Cookie("erp_refresh", "old-raw")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
                        containsString("erp_refresh=new-raw"), containsString("HttpOnly"),
                        containsString("Path=/auth"))));
    }

    @Test
    void refreshFailureReturns401AndClearsCookie() throws Exception {
        when(authService.refresh(any())).thenThrow(new InvalidCredentialsException());

        mockMvc.perform(post("/auth/refresh").header(XRW, "XMLHttpRequest")
                        .cookie(new Cookie("erp_refresh", "bad")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Authentication required"))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
                        containsString("erp_refresh="), containsString("Max-Age=0"), containsString("Path=/auth"))));
    }

    @Test
    void refreshWithoutCookieReturns401() throws Exception {
        when(authService.refresh(isNull())).thenThrow(new InvalidCredentialsException());

        mockMvc.perform(post("/auth/refresh").header(XRW, "XMLHttpRequest"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")));
    }

    @Test
    void logoutClearsCookie() throws Exception {
        mockMvc.perform(post("/auth/logout").header(XRW, "XMLHttpRequest")
                        .cookie(new Cookie("erp_refresh", "raw")))
                .andExpect(status().isNoContent())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
                        containsString("erp_refresh="), containsString("Max-Age=0"),
                        containsString("Path=/auth"), containsString("HttpOnly"))));

        verify(authService).logout("raw");
    }

    @Test
    void logoutWithoutXRequestedWithReturns403() throws Exception {
        mockMvc.perform(post("/auth/logout").cookie(new Cookie("erp_refresh", "raw")))
                .andExpect(status().isForbidden());

        verify(authService, never()).logout(any());
    }

    @Test
    void meRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Authentication required"));
    }

    @Test
    void meIsReadableByEveryRole() throws Exception {
        for (UserRole role : UserRole.values()) {
            when(authService.me(1L)).thenReturn(user(role));

            mockMvc.perform(get("/auth/me").with(asUser(1L, role.name())))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.role").value(role.name()));
        }
    }

    @Test
    void meAcceptsRealTokenIssuedByJwtService() throws Exception {
        String token = new JwtService(jwtEncoder, jwtProperties, Clock.systemUTC())
                .issueAccessToken(1L, "admin@shop.com", UserRole.CASHIER).token();
        when(authService.me(1L)).thenReturn(user(UserRole.CASHIER));

        mockMvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("admin@shop.com"));

        verify(authService).me(1L);
    }

    @Test
    void meRejectsTamperedToken() throws Exception {
        String token = new JwtService(jwtEncoder, jwtProperties, Clock.systemUTC())
                .issueAccessToken(1L, "admin@shop.com", UserRole.CASHIER).token();
        int lastDot = token.lastIndexOf('.');
        char flipped = token.charAt(lastDot + 1) == 'A' ? 'B' : 'A';
        String tampered = token.substring(0, lastDot + 1) + flipped + token.substring(lastDot + 2);

        mockMvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + tampered))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Authentication required"));

        verify(authService, never()).me(1L);
    }

    @Test
    void changePasswordReturns204AndKeepsCurrentSession() throws Exception {
        mockMvc.perform(put("/auth/me/password").with(asUser(1L, "STOCK"))
                        .cookie(new Cookie("erp_refresh", "current-raw"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"old-password\",\"newPassword\":\"new-password\"}"))
                .andExpect(status().isNoContent());

        verify(authService).changePassword(1L, "current-raw", "old-password", "new-password");
    }

    @Test
    void changePasswordWrongCurrentReturnsFieldError() throws Exception {
        doThrow(new FieldErrorException("currentPassword", "Current password is incorrect"))
                .when(authService).changePassword(eq(1L), any(), eq("wrong"), eq("new-password"));

        mockMvc.perform(put("/auth/me/password").with(asUser(1L, "CASHIER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"wrong\",\"newPassword\":\"new-password\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.currentPassword").value("Current password is incorrect"));
    }

    @Test
    void changePasswordRejectsShortNewPassword() throws Exception {
        mockMvc.perform(put("/auth/me/password").with(asUser(1L, "CASHIER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"old-password\",\"newPassword\":\"short\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.newPassword").exists());

        verify(authService, never()).changePassword(any(Long.class), any(), any(), any());
    }

    @Test
    void changePasswordRejectsNewPasswordOver72Bytes() throws Exception {
        String accented = "é".repeat(40); // 40 characters, 80 UTF-8 bytes

        mockMvc.perform(put("/auth/me/password").with(asUser(1L, "CASHIER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"old-password\",\"newPassword\":\"" + accented + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.newPassword").value("Password must be at most 72 bytes"));

        verify(authService, never()).changePassword(any(Long.class), any(), any(), any());
    }

    @Test
    void changePasswordAcceptsExactly72Bytes() throws Exception {
        String password = "é".repeat(36); // 72 UTF-8 bytes

        mockMvc.perform(put("/auth/me/password").with(asUser(1L, "CASHIER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"old-password\",\"newPassword\":\"" + password + "\"}"))
                .andExpect(status().isNoContent());
    }

    @Test
    void loginRejectsPasswordOver72Bytes() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@shop.com\",\"password\":\"" + "é".repeat(40) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.password").value("Password must be at most 72 bytes"));

        verify(authService, never()).login(any(), any());
    }

    @Test
    void changePasswordRequiresAuthentication() throws Exception {
        mockMvc.perform(put("/auth/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"old-password\",\"newPassword\":\"new-password\"}"))
                .andExpect(status().isUnauthorized());
    }
}
