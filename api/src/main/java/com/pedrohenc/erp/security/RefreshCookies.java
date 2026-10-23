package com.pedrohenc.erp.security;

import com.pedrohenc.erp.config.AuthProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class RefreshCookies {

    public static final String NAME = "erp_refresh";
    public static final String PATH = "/auth";

    private final AuthProperties properties;

    public ResponseCookie create(String raw) {
        return build(raw, properties.refreshTtl());
    }

    public ResponseCookie clear() {
        return build("", Duration.ZERO);
    }

    private ResponseCookie build(String value, Duration maxAge) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .secure(properties.cookie().secure())
                .sameSite(properties.cookie().sameSite())
                .path(PATH)
                .maxAge(maxAge)
                .build();
    }
}
