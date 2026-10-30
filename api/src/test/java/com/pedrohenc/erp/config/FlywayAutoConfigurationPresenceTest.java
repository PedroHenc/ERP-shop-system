package com.pedrohenc.erp.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.context.annotation.ImportCandidates;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * In Spring Boot 4 Flyway's auto-configuration lives in spring-boot-flyway, not spring-boot-autoconfigure.
 * With only flyway-core on the classpath nothing runs the migrations and ddl-auto=validate fails at boot.
 * This catches that regression without Docker.
 */
class FlywayAutoConfigurationPresenceTest {

    private static final String FLYWAY_AUTO_CONFIGURATION =
            "org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration";

    @Test
    void flywayAutoConfigurationIsOnTheClasspathAndRegistered() {
        assertThatCode(() -> Class.forName(FLYWAY_AUTO_CONFIGURATION)).doesNotThrowAnyException();
        ImportCandidates candidates = ImportCandidates.load(AutoConfiguration.class, getClass().getClassLoader());
        assertThat(candidates.getCandidates()).contains(FLYWAY_AUTO_CONFIGURATION);
    }
}
