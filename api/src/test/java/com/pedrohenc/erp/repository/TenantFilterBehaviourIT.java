package com.pedrohenc.erp.repository;

import com.pedrohenc.erp.TestcontainersConfiguration;
import com.pedrohenc.erp.entity.TbBrand;
import com.pedrohenc.erp.entity.TbStore;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Hibernate's {@code @TenantId} filter against a real PostgreSQL: a session bound to a store (JWT
 * {@code store} claim) sees and writes only that store; a session without a JWT runs as root, sees
 * every store and must assign {@code storeId} itself. Skipped when Docker is not available.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class TenantFilterBehaviourIT {

    private static final long STORE_ONE = 1L;

    @Autowired
    private BrandRepository brandRepository;
    @Autowired
    private StoreRepository storeRepository;
    @Autowired
    private TransactionTemplate transactionTemplate;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    private long storeTwoId;
    private long storeOneBrandId;
    private long storeTwoBrandId;

    @BeforeEach
    void seed() {
        jdbcTemplate.update("delete from shop_api.tb_product_suppliers");
        jdbcTemplate.update("delete from shop_api.tb_products");
        jdbcTemplate.update("delete from shop_api.tb_brands");
        jdbcTemplate.update("delete from shop_api.tb_stores where id <> 1");

        // Root mode (no authentication): the store is given explicitly.
        storeTwoId = storeRepository.save(TbStore.builder().name("Segunda loja").build()).getId();
        storeOneBrandId = brandRepository.save(TbBrand.builder().storeId(STORE_ONE).name("Store one brand").build()).getId();
        storeTwoBrandId = brandRepository.save(TbBrand.builder().storeId(storeTwoId).name("Store two brand").build()).getId();
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    /** Runs {@code work} in a new transaction whose session is bound to store 1 by a JWT. */
    private <T> T asStoreOne(Supplier<T> work) {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "HS256")
                .subject("1")
                .claim("email", "ana@shop.com")
                .claim("store", STORE_ONE)
                .build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));
        try {
            return transactionTemplate.execute(status -> work.get());
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void findByIdOfOtherStoreIsEmpty() {
        Optional<TbBrand> found = asStoreOne(() -> brandRepository.findById(storeTwoBrandId));

        assertThat(found).isEmpty();
    }

    @Test
    void findAllSeesOnlyOwnStore() {
        List<Long> ids = asStoreOne(() -> brandRepository.findAll().stream().map(TbBrand::getId).toList());

        assertThat(ids).containsExactly(storeOneBrandId);
    }

    @Test
    void insertTakesStoreFromToken() {
        long id = asStoreOne(() -> brandRepository.save(TbBrand.builder().name("From token").build()).getId());

        assertThat(brandRepository.findById(id).orElseThrow().getStoreId()).isEqualTo(STORE_ONE);
    }

    @Test
    void rootInsertKeepsExplicitStoreId() {
        long id = brandRepository.save(TbBrand.builder().storeId(storeTwoId).name("Explicit").build()).getId();

        assertThat(brandRepository.findById(id).orElseThrow().getStoreId()).isEqualTo(storeTwoId);
    }

    @Test
    void rootInsertWithoutStoreIdFails() {
        // Root's tenant id (0) is not a store, so the foreign key rejects the row.
        assertThatThrownBy(() -> brandRepository.save(TbBrand.builder().name("Orphan").build()))
                .isInstanceOf(DataIntegrityViolationException.class);

        assertThat(brandRepository.findAll()).extracting(TbBrand::getStoreId).doesNotContain(0L);
    }

    @Test
    void sameNameAllowedAcrossStores() {
        brandRepository.save(TbBrand.builder().storeId(STORE_ONE).name("Acme").build());
        brandRepository.save(TbBrand.builder().storeId(storeTwoId).name("Acme").build());

        assertThat(brandRepository.findAll())
                .filteredOn(brand -> brand.getName().equals("Acme"))
                .extracting(TbBrand::getStoreId)
                .containsExactlyInAnyOrder(STORE_ONE, storeTwoId);
    }
}
