package com.pedrohenc.erp.security;

import com.pedrohenc.erp.config.AuthProperties;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshCookiesTest {

    private static RefreshCookies cookies(String path) {
        return new RefreshCookies(new AuthProperties(Duration.ofDays(7), new AuthProperties.Cookie(true, "Strict", path)));
    }

    @Test
    void createUsesTheConfiguredPathAndAttributes() {
        ResponseCookie cookie = cookies("/api/auth").create("raw");

        assertThat(cookie.getName()).isEqualTo(RefreshCookies.NAME);
        assertThat(cookie.getValue()).isEqualTo("raw");
        assertThat(cookie.getPath()).isEqualTo("/api/auth");
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.isSecure()).isTrue();
        assertThat(cookie.getSameSite()).isEqualTo("Strict");
        assertThat(cookie.getMaxAge()).isEqualTo(Duration.ofDays(7));
    }

    @Test
    void clearExpiresTheCookieOnTheSamePath() {
        ResponseCookie cookie = cookies("/api/auth").clear();

        assertThat(cookie.getPath()).isEqualTo("/api/auth");
        assertThat(cookie.getMaxAge()).isEqualTo(Duration.ZERO);
        assertThat(cookie.getValue()).isEmpty();
    }
}
