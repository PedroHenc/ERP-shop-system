package com.pedrohenc.erp.repository;

import com.pedrohenc.erp.TestcontainersConfiguration;
import com.pedrohenc.erp.entity.TbStore;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UserRole;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The global e-mail checks are native SQL against a real PostgreSQL: they must find the table in the
 * configured schema and see every store, even from a session bound to one store. Skipped when Docker
 * is not available.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class UserEmailQueriesIT {

    private static final long STORE_ONE = 1L;
    private static final String STORE_ONE_EMAIL = "one@email-queries.test";
    private static final String STORE_TWO_EMAIL = "two@email-queries.test";

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private StoreRepository storeRepository;
    @Autowired
    private TransactionTemplate transactionTemplate;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    private long storeTwoId;
    private long storeOneUserId;
    private long storeTwoUserId;

    @BeforeEach
    void seed() {
        cleanUp();
        // Root mode (no authentication): the store is given explicitly.
        storeTwoId = storeRepository.save(TbStore.builder().name("Loja de e-mails").build()).getId();
        storeOneUserId = userRepository.save(user(STORE_ONE, STORE_ONE_EMAIL)).getId();
        storeTwoUserId = userRepository.save(user(storeTwoId, STORE_TWO_EMAIL)).getId();
    }

    @AfterEach
    void cleanUp() {
        SecurityContextHolder.clearContext();
        jdbcTemplate.update("delete from shop_api.tb_refresh_tokens where user_id in "
                + "(select id from shop_api.tb_users where email like '%@email-queries.test')");
        jdbcTemplate.update("delete from shop_api.tb_users where email like '%@email-queries.test'");
        jdbcTemplate.update("delete from shop_api.tb_stores where name = 'Loja de e-mails'");
    }

    private static TbUser user(long storeId, String email) {
        return TbUser.builder()
                .storeId(storeId)
                .name("User " + email)
                .email(email)
                .passwordHash("{bcrypt}hash")
                .role(UserRole.CASHIER)
                .active(true)
                .build();
    }

    /** Runs {@code work} in a new transaction whose session is bound to store 1 by a JWT. */
    private <T> T asStoreOne(Supplier<T> work) {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "HS256")
                .subject(String.valueOf(storeOneUserId))
                .claim("email", STORE_ONE_EMAIL)
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
    void existsByEmailInAnyStoreFindsOtherStoresEmail() {
        assertThat(asStoreOne(() -> userRepository.existsByEmailInAnyStore(STORE_TWO_EMAIL))).isTrue();
        assertThat(asStoreOne(() -> userRepository.existsByEmailInAnyStore("nobody@email-queries.test"))).isFalse();
    }

    @Test
    void existsByEmailInAnyStoreAndIdNotExcludesOwnId() {
        assertThat(asStoreOne(() -> userRepository.existsByEmailInAnyStoreAndIdNot(STORE_TWO_EMAIL, storeTwoUserId)))
                .isFalse();
        assertThat(asStoreOne(() -> userRepository.existsByEmailInAnyStoreAndIdNot(STORE_TWO_EMAIL, storeOneUserId)))
                .isTrue();
    }
}
