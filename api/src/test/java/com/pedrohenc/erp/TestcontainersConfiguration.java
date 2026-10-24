package com.pedrohenc.erp;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.test.context.DynamicPropertyRegistrar;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Real PostgreSQL for {@code @SpringBootTest}s. Use together with
 * {@code @Testcontainers(disabledWithoutDocker = true)} so the build stays green without Docker.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    @Bean
    @ServiceConnection
    PostgreSQLContainer postgresContainer() {
        return new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"));
    }

    /** The main config uses the {@code shop_api} schema, which a fresh container does not have. */
    @Bean
    DynamicPropertyRegistrar createSchemaProperties() {
        return registry -> registry.add("spring.jpa.properties.hibernate.hbm2ddl.create_namespaces", () -> "true");
    }
}
