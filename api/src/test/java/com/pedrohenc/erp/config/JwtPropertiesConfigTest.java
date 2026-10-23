package com.pedrohenc.erp.config;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtPropertiesConfigTest {

    private static final String MESSAGE = "app.jwt.secret (APP_JWT_SECRET) must be at least 32 bytes";

    @Test
    void rejectsSecretShorterThan32Bytes() {
        assertThatThrownBy(() -> new JwtProperties("short", Duration.ofMinutes(15)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage(MESSAGE);
    }

    @Test
    void rejectsMissingSecret() {
        assertThatThrownBy(() -> new JwtProperties(null, Duration.ofMinutes(15)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage(MESSAGE);
    }

    @Test
    void acceptsSecretOf32Bytes() {
        assertThat(new JwtProperties("x".repeat(32), Duration.ofMinutes(15)).secret()).hasSize(32);
    }
}