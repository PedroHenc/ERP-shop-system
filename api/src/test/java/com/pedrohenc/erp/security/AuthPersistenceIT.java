package com.pedrohenc.erp.security;

import com.pedrohenc.erp.TestcontainersConfiguration;
import com.pedrohenc.erp.dto.user.UserCreateRequest;
import com.pedrohenc.erp.entity.TbRefreshToken;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UserRole;
import com.pedrohenc.erp.exception.InvalidCredentialsException;
import com.pedrohenc.erp.repository.RefreshTokenRepository;
import com.pedrohenc.erp.repository.UserRepository;
import com.pedrohenc.erp.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Auth persistence against a real PostgreSQL: JPQL bulk updates, {@code @Lock(PESSIMISTIC_WRITE)}
 * and {@code noRollbackFor}, through the real repositories and services (no test transaction, so
 * each service call commits or rolls back on its own). Skipped when Docker is not available.
 */
@SpringBootTest
@Import({TestcontainersConfiguration.class, AuthPersistenceIT.TestClockConfig.class})
@Testcontainers(disabledWithoutDocker = true)
class AuthPersistenceIT {

    private static final String EMAIL = "ana@shop.com";
    private static final String PASSWORD = "correct-horse-1";

    @TestConfiguration(proxyBeanMethods = false)
    static class TestClockConfig {
        @Bean
        @Primary
        MutableClock mutableClock() {
            // Postgres timestamps keep microseconds.
            return new MutableClock(Instant.now().truncatedTo(ChronoUnit.MILLIS));
        }
    }

    /** A clock the test can move forward; the services read it on every call. */
    static final class MutableClock extends Clock {
        private volatile Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    @Autowired
    private UserService userService;
    @Autowired
    private AuthService authService;
    @Autowired
    private RefreshTokenService refreshTokenService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private RefreshTokenRepository refreshTokenRepository;
    @Autowired
    private JdbcTemplate jdbcTemplate;
    @Autowired
    private MutableClock clock;

    private long userId;

    @BeforeEach
    void createUser() {
        refreshTokenRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();
        userId = userService.create(new UserCreateRequest("Ana", EMAIL, UserRole.MANAGER, true, PASSWORD)).id();
    }

    private String login() {
        return authService.login(EMAIL, PASSWORD).refreshToken();
    }

    private List<TbRefreshToken> activeTokens() {
        return refreshTokenRepository.findAll().stream().filter(t -> t.getRevokedAt() == null).toList();
    }

    private TbUser reloadUser() {
        return userRepository.findById(userId).orElseThrow();
    }

    @Test
    void refreshRotatesAllowsOneConcurrentReuseAndRevokesAllOnReuseAfterGrace() throws Exception {
        String original = login();

        // Two refreshes with the same token at the same time: the row lock serializes them,
        // one rotates the token and the other is accepted through the 30 s grace.
        CountDownLatch start = new CountDownLatch(1);
        Callable<String> refresh = () -> {
            start.await();
            return authService.refresh(original).refreshToken();
        };
        String first;
        String second;
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<String> a = executor.submit(refresh);
            Future<String> b = executor.submit(refresh);
            start.countDown();
            first = a.get();
            second = b.get();
        }
        assertThat(first).isNotEqualTo(second).isNotEqualTo(original);
        assertThat(activeTokens()).hasSize(2);
        TbRefreshToken rotated = refreshTokenRepository.findAll().stream()
                .filter(t -> t.getRevokedAt() != null).findFirst().orElseThrow();
        assertThat(rotated.getGraceUsedAt()).isNotNull();

        // Reuse after the grace: treated as theft. The family revocation is kept although the
        // call fails (noRollbackFor), so the sessions minted above are dead too.
        clock.advance(Duration.ofSeconds(31));
        assertThatThrownBy(() -> authService.refresh(original)).isInstanceOf(InvalidCredentialsException.class);

        assertThat(activeTokens()).isEmpty();
        assertThatThrownBy(() -> authService.refresh(first)).isInstanceOf(InvalidCredentialsException.class);
        assertThatThrownBy(() -> authService.refresh(second)).isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void secondReuseWithinGraceRevokesAll() {
        String original = login();
        String next = authService.refresh(original).refreshToken();
        authService.refresh(original); // the single grace reuse
        assertThatThrownBy(() -> authService.refresh(original)).isInstanceOf(InvalidCredentialsException.class);

        assertThat(activeTokens()).isEmpty();
        assertThatThrownBy(() -> authService.refresh(next)).isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void revokeAllEndsEverySession() {
        String a = login();
        String b = login();
        assertThat(activeTokens()).hasSize(2);

        refreshTokenService.revokeAll(userId);

        assertThat(activeTokens()).isEmpty();
        assertThatThrownBy(() -> authService.refresh(a)).isInstanceOf(InvalidCredentialsException.class);
        assertThatThrownBy(() -> authService.refresh(b)).isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void logoutRevokesOnlyThatSessionAndReusingItIsJustRejected() {
        String kept = login();
        String loggedOut = login();

        authService.logout(loggedOut);

        assertThatThrownBy(() -> authService.refresh(loggedOut)).isInstanceOf(InvalidCredentialsException.class);
        assertThat(activeTokens()).hasSize(1);
        assertThat(authService.refresh(kept).refreshToken()).isNotBlank();
    }

    @Test
    void fiveFailedLoginsLockTheAccount() {
        for (int i = 0; i < AuthService.MAX_FAILED_ATTEMPTS; i++) {
            assertThatThrownBy(() -> authService.login(EMAIL, "wrong-password"))
                    .isInstanceOf(InvalidCredentialsException.class);
        }

        TbUser locked = reloadUser();
        assertThat(locked.getLockedUntil()).isEqualTo(clock.instant().plus(AuthService.LOCK_DURATION));
        assertThat(locked.getFailedAttempts()).isZero();
        assertThatThrownBy(this::login).isInstanceOf(InvalidCredentialsException.class);

        clock.advance(AuthService.LOCK_DURATION.plusSeconds(1));
        assertThat(login()).isNotBlank();
    }

    @Test
    void loginBookkeepingDoesNotChangeTheVersion() {
        long versionBefore = reloadUser().getVersion();
        assertThatThrownBy(() -> authService.login(EMAIL, "wrong-password"))
                .isInstanceOf(InvalidCredentialsException.class);
        assertThat(reloadUser().getFailedAttempts()).isEqualTo(1);

        login();

        TbUser after = reloadUser();
        assertThat(after.getVersion()).isEqualTo(versionBefore);
        assertThat(after.getLastLoginAt()).isEqualTo(clock.instant());
        assertThat(after.getFailedAttempts()).isZero();
    }

    @Test
    void refreshTokensHaveAUserIdIndex() {
        List<String> indexes = jdbcTemplate.queryForList(
                "select indexname from pg_indexes where schemaname = 'shop_api' and tablename = 'tb_refresh_tokens'",
                String.class);

        assertThat(indexes).contains("idx_refresh_tokens_user_id");
    }
}
