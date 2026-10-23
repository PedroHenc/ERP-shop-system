package com.pedrohenc.erp.security;

import com.pedrohenc.erp.dto.user.UserResponse;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UserRole;
import com.pedrohenc.erp.exception.FieldErrorException;
import com.pedrohenc.erp.exception.InvalidCredentialsException;
import com.pedrohenc.erp.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-23T12:00:00Z");
    private static final String HASH = "{bcrypt}hash";

    @Mock
    private UserRepository userRepository;
    @Mock
    private RefreshTokenService refreshTokenService;
    @Mock
    private JwtService jwtService;
    @Mock
    private PasswordEncoder passwordEncoder;

    private MutableClock clock;
    private AuthService service;
    private TbUser user;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(NOW);
        service = new AuthService(userRepository, refreshTokenService, jwtService, passwordEncoder, clock);
        user = TbUser.builder().id(1L).version(0L).name("Administrator").email("admin@shop.com")
                .passwordHash(HASH).role(UserRole.ADMIN).active(true).build();
        lenient().when(userRepository.findByEmail("admin@shop.com")).thenReturn(Optional.of(user));
        lenient().when(passwordEncoder.matches("right-password", HASH)).thenReturn(true);
        lenient().when(jwtService.issueAccessToken(1L, "admin@shop.com", UserRole.ADMIN))
                .thenReturn(new JwtService.IssuedToken("access", 900));
        lenient().when(refreshTokenService.issue(user)).thenReturn("refresh");
    }

    private void failLogin() {
        assertThatThrownBy(() -> service.login("admin@shop.com", "wrong"))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid email or password");
    }

    @Test
    void loginNormalizesEmailAndResetsFailures() {
        user.setFailedAttempts(3);

        AuthService.LoginResult result = service.login("  Admin@Shop.com ", "right-password");

        verify(userRepository).findByEmail("admin@shop.com");
        assertThat(result.refreshToken()).isEqualTo("refresh");
        assertThat(result.body().accessToken()).isEqualTo("access");
        assertThat(result.body().expiresIn()).isEqualTo(900);
        assertThat(result.body().user().email()).isEqualTo("admin@shop.com");
        assertThat(result.body().user().role()).isEqualTo(UserRole.ADMIN);
        assertThat(user.getFailedAttempts()).isZero();
        assertThat(user.getLockedUntil()).isNull();
        assertThat(user.getLastLoginAt()).isEqualTo(NOW);
        assertThat(result.body().user().lastLoginAt()).isEqualTo(NOW);
    }

    @Test
    void wrongPasswordIncrementsFailuresAndLocksOnFifth() {
        for (int i = 1; i <= 4; i++) {
            failLogin();
            assertThat(user.getFailedAttempts()).isEqualTo(i);
            assertThat(user.getLockedUntil()).isNull();
        }

        failLogin();

        assertThat(user.getLockedUntil()).isEqualTo(NOW.plus(Duration.ofMinutes(15)));
        verify(refreshTokenService, never()).issue(any());
    }

    @Test
    void lockedUserGetsSameErrorEvenWithCorrectPassword() {
        user.setLockedUntil(NOW.plus(Duration.ofMinutes(10)));

        assertThatThrownBy(() -> service.login("admin@shop.com", "right-password"))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid email or password");
        verify(refreshTokenService, never()).issue(any());
        assertThat(user.getLastLoginAt()).isNull();
    }

    @Test
    void lockExpiresAfter15Minutes() {
        for (int i = 0; i < 5; i++) {
            failLogin();
        }
        clock.advance(Duration.ofMinutes(14).plusSeconds(59));
        assertThatThrownBy(() -> service.login("admin@shop.com", "right-password"))
                .isInstanceOf(InvalidCredentialsException.class);

        clock.advance(Duration.ofSeconds(1));
        AuthService.LoginResult result = service.login("admin@shop.com", "right-password");

        assertThat(result.body().accessToken()).isEqualTo("access");
        assertThat(user.getFailedAttempts()).isZero();
        assertThat(user.getLockedUntil()).isNull();
    }

    @Test
    void inactiveUserCannotLogin() {
        user.setActive(false);

        assertThatThrownBy(() -> service.login("admin@shop.com", "right-password"))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid email or password");
        verify(refreshTokenService, never()).issue(any());
    }

    @Test
    void unknownEmailGetsSameError() {
        when(userRepository.findByEmail("nobody@shop.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.login("nobody@shop.com", "right-password"))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid email or password");
        verify(refreshTokenService, never()).issue(any());
    }

    @Test
    void loginFailuresDoNotRollBackTheFailureCounter() throws Exception {
        Transactional tx = AuthService.class.getMethod("login", String.class, String.class)
                .getAnnotation(Transactional.class);
        Transactional refreshTx = AuthService.class.getMethod("refresh", String.class)
                .getAnnotation(Transactional.class);

        assertThat(tx.noRollbackFor()).contains(InvalidCredentialsException.class);
        assertThat(refreshTx.noRollbackFor()).contains(InvalidCredentialsException.class);
    }

    @Test
    void refreshRotatesAndIssuesAccessToken() {
        when(refreshTokenService.rotate("old")).thenReturn(new RefreshTokenService.RotationResult(user, "new"));

        AuthService.LoginResult result = service.refresh("old");

        assertThat(result.refreshToken()).isEqualTo("new");
        assertThat(result.body().accessToken()).isEqualTo("access");
        assertThat(result.body().user().id()).isEqualTo(1L);
    }

    @Test
    void logoutRevokesTokenWhenPresent() {
        service.logout("raw");
        service.logout(null);

        verify(refreshTokenService).revoke("raw");
        verify(refreshTokenService, never()).revoke(null);
    }

    @Test
    void meReturnsUser() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        UserResponse response = service.me(1L);

        assertThat(response.name()).isEqualTo("Administrator");
        assertThat(response.version()).isZero();
    }

    @Test
    void changePasswordRejectsWrongCurrent() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.changePassword(1L, "raw", "wrong", "new-password"))
                .isInstanceOf(FieldErrorException.class)
                .hasMessage("Current password is incorrect")
                .extracting("field").isEqualTo("currentPassword");
        assertThat(user.getPasswordHash()).isEqualTo(HASH);
        verify(refreshTokenService, never()).revokeAllExcept(any(), any());
        verify(passwordEncoder, never()).encode(anyString());
    }

    @Test
    void changePasswordRevokesOtherSessions() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("new-password")).thenReturn("{bcrypt}new");

        service.changePassword(1L, "current-refresh", "right-password", "new-password");

        assertThat(user.getPasswordHash()).isEqualTo("{bcrypt}new");
        verify(refreshTokenService).revokeAllExcept(1L, "current-refresh");
    }

    private static final class MutableClock extends Clock {
        private Instant instant;

        MutableClock(Instant instant) {
            this.instant = instant;
        }

        void advance(Duration duration) {
            instant = instant.plus(duration);
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
            return instant;
        }
    }
}
