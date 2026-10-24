package com.pedrohenc.erp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app.auth")
public record AuthProperties(Duration refreshTtl, Cookie cookie) {

    public record Cookie(boolean secure, String sameSite) {
    }
}