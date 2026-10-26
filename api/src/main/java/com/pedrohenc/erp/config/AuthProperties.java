package com.pedrohenc.erp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app.auth")
public record AuthProperties(Duration refreshTtl, Cookie cookie) {

    /** {@code path} is where the browser sends the refresh cookie: {@code /auth} direct, {@code /api/auth} behind the front's proxy. */
    public record Cookie(boolean secure, String sameSite, String path) {
    }
}