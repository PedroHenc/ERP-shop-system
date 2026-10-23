package com.pedrohenc.erp.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import static org.assertj.core.api.Assertions.assertThat;

/** The test overrides (classpath:config/application.properties) must layer over the main file, not replace it. */
class TestPropertiesConfigTest {

    @Configuration(proxyBeanMethods = false)
    static class Empty {
    }

    @Test
    void mainPropertiesStillLoadAndTestOverridesWin() {
        SpringApplication application = new SpringApplication(Empty.class);
        application.setWebApplicationType(WebApplicationType.NONE);
        try (ConfigurableApplicationContext context = application.run()) {
            Environment env = context.getEnvironment();
            // Only in src/main/resources/application.properties.
            assertThat(env.getProperty("spring.jpa.properties.hibernate.default_schema")).isEqualTo("shop_api");
            assertThat(env.getProperty("spring.datasource.driver-class-name")).isEqualTo("org.postgresql.Driver");
            // Overridden by src/test/resources/config/application.properties.
            assertThat(env.getProperty("app.jwt.secret")).isEqualTo("test-secret-test-secret-test-secret-test-secret-");
            assertThat(env.getProperty("app.bootstrap.admin.email")).isEmpty();
        }
    }
}
