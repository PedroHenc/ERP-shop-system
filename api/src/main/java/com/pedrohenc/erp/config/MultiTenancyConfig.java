package com.pedrohenc.erp.config;

import com.pedrohenc.erp.security.StoreTenantResolver;
import org.hibernate.cfg.AvailableSettings;
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Registers the store resolver for Hibernate's discriminator multi-tenancy ({@code @TenantId}). */
@Configuration
public class MultiTenancyConfig {

    @Bean
    HibernatePropertiesCustomizer tenantIdentifierResolverCustomizer() {
        return properties -> properties.put(AvailableSettings.MULTI_TENANT_IDENTIFIER_RESOLVER, new StoreTenantResolver());
    }
}
