package com.pedrohenc.erp.security;

import com.pedrohenc.erp.config.AuthProperties;
import com.pedrohenc.erp.entity.RevokedReason;
import com.pedrohenc.erp.entity.TbRefreshToken;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UserRole;
import com.pedrohenc.erp.exception.InvalidCredentialsException;
import com.pedrohenc.erp.repository.RefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.function.Predicate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-23T12:00:00Z");
    private static final Duration TTL = Duration.ofDays(7);
    private static final String RAW = "raw-token-value";

    @Mock
    private RefreshTokenRepository repository;

    private RefreshTokenService service;
    private TbUser user;

    @BeforeEach
    void setUp() {
        AuthProperties properties = new AuthProperties(TTL, new AuthProperties.Cookie(false, "Lax", "/auth"));
        service = new RefreshTokenService(repository, properties, Clock.fixed(NOW, ZoneOffset.UTC));
        user = TbUser.builder().id(7L).storeId(4L).name("Ana").email("ana@shop.com").passwordHash("h")
                .role(UserRole.CASHIER).active(true).build();
        lenient().when(repository.save(any(TbRefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static String sha256(String raw) throws Exception {
        return HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8)));
    }

    private TbRefreshToken stored(Instant expiresAt, Instant revokedAt, RevokedReason reason) throws Exception {
        return TbRefreshToken.builder().id(1L).user(user).tokenHash(sha256(RAW))
                .createdAt(NOW.minus(Duration.ofDays(1))).expiresAt(expiresAt)
                .revokedAt(revokedAt).revokedReason(reason).build();
    }

    private void givenStored(TbRefreshToken token) throws Exception {
        when(repository.findByTokenHash(sha256(RAW))).thenReturn(Optional.of(token));
    }

    @Test
    void issueStoresUsersStore() {
        service.issue(user);

        ArgumentCaptor<TbRefreshToken> captor = ArgumentCaptor.forClass(TbRefreshToken.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getStoreId()).isEqualTo(user.getStoreId()).isEqualTo(4L);
    }

    @Test
    void issueStoresOnlySha256Hash() throws Exception {
        String raw = service.issue(user);

        ArgumentCaptor<TbRefreshToken> captor = ArgumentCaptor.forClass(TbRefreshToken.class);
        verify(repository).save(captor.capture());
        TbRefreshToken saved = captor.getValue();
        assertThat(raw).isNotBlank().doesNotContain("=").doesNotContain("+").doesNotContain("/");
        assertThat(raw).hasSize(43); // 32 bytes, base64url without padding
        assertThat(saved.getTokenHash()).isEqualTo(sha256(raw)).hasSize(64).isNotEqualTo(raw);
        assertThat(saved.getUser()).isSameAs(user);
        assertThat(saved.getCreatedAt()).isEqualTo(NOW);
        assertThat(saved.getExpiresAt()).isEqualTo(NOW.plus(TTL));
        assertThat(saved.getRevokedAt()).isNull();
        assertThat(service.issue(user)).isNotEqualTo(raw);
    }

    @Test
    void rotateRevokesOldAndIssuesNew() throws Exception {
        TbRefreshToken old = stored(NOW.plus(Duration.ofDays(6)), null, null);
        givenStored(old);

        RefreshTokenService.RotationResult result = service.rotate(RAW);

        assertThat(result.user()).isSameAs(user);
        assertThat(result.newRawToken()).isNotBlank().isNotEqualTo(RAW);
        assertThat(old.getRevokedAt()).isEqualTo(NOW);
        assertThat(old.getRevokedReason()).isEqualTo(RevokedReason.ROTATED);
        ArgumentCaptor<TbRefreshToken> captor = ArgumentCaptor.forClass(TbRefreshToken.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getTokenHash()).isEqualTo(sha256(result.newRawToken()));
        verify(repository, never()).revokeAllActiveByUserId(anyLong(), any());
    }

    @Test
    void unknownTokenIsRejected() {
        when(repository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.rotate("unknown")).isInstanceOf(InvalidCredentialsException.class);
        assertThatThrownBy(() -> service.rotate(null)).isInstanceOf(InvalidCredentialsException.class);
        assertThatThrownBy(() -> service.rotate(" ")).isInstanceOf(InvalidCredentialsException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void expiredTokenIsRejected() throws Exception {
        TbRefreshToken old = stored(NOW, null, null);
        givenStored(old);

        assertThatThrownBy(() -> service.rotate(RAW)).isInstanceOf(InvalidCredentialsException.class);
        verify(repository, never()).save(any());
        assertThat(old.getRevokedAt()).isNull();
    }

    @Test
    void inactiveUsersTokenIsRejected() throws Exception {
        user.setActive(false);
        givenStored(stored(NOW.plus(Duration.ofDays(6)), null, null));

        assertThatThrownBy(() -> service.rotate(RAW)).isInstanceOf(InvalidCredentialsException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void reuseWithin30SecondsOfRotationIsAccepted() throws Exception {
        TbRefreshToken old = stored(NOW.plus(Duration.ofDays(6)), NOW.minusSeconds(20), RevokedReason.ROTATED);
        givenStored(old);

        RefreshTokenService.RotationResult result = service.rotate(RAW);

        assertThat(result.user()).isSameAs(user);
        assertThat(result.newRawToken()).isNotBlank().isNotEqualTo(RAW);
        verify(repository).save(any(TbRefreshToken.class));
        verify(repository, never()).revokeAllActiveByUserId(anyLong(), any());
        assertThat(old.getRevokedAt()).isEqualTo(NOW.minusSeconds(20));
        assertThat(old.getRevokedReason()).isEqualTo(RevokedReason.ROTATED);
    }

    @Test
    void reuseExactlyAt30SecondsIsStillAccepted() throws Exception {
        givenStored(stored(NOW.plus(Duration.ofDays(6)), NOW.minusSeconds(30), RevokedReason.ROTATED));

        assertThat(service.rotate(RAW).newRawToken()).isNotBlank();
        verify(repository, never()).revokeAllActiveByUserId(anyLong(), any());
    }

    @Test
    void reuseWithinGraceOfInactiveUserIsRejected() throws Exception {
        user.setActive(false);
        givenStored(stored(NOW.plus(Duration.ofDays(6)), NOW.minusSeconds(20), RevokedReason.ROTATED));

        assertThatThrownBy(() -> service.rotate(RAW)).isInstanceOf(InvalidCredentialsException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void reuseAfter30SecondsRevokesAllSessions() throws Exception {
        givenStored(stored(NOW.plus(Duration.ofDays(6)), NOW.minusSeconds(31), RevokedReason.ROTATED));

        assertThatThrownBy(() -> service.rotate(RAW)).isInstanceOf(InvalidCredentialsException.class);
        verify(repository).revokeAllActiveByUserId(7L, NOW);
        verify(repository, never()).save(any());
    }

    @Test
    void tokenRevokedByLogoutIsNotGivenGrace() throws Exception {
        givenStored(stored(NOW.plus(Duration.ofDays(6)), NOW.minusSeconds(5), RevokedReason.LOGOUT));

        assertThatThrownBy(() -> service.rotate(RAW)).isInstanceOf(InvalidCredentialsException.class);
        verify(repository, never()).save(any());
        verify(repository, never()).revokeAllActiveByUserId(anyLong(), any());
    }

    @Test
    void tokenRevokedByAdminIsNotGivenGrace() throws Exception {
        givenStored(stored(NOW.plus(Duration.ofDays(6)), NOW.minusSeconds(5), RevokedReason.REVOKED));

        assertThatThrownBy(() -> service.rotate(RAW)).isInstanceOf(InvalidCredentialsException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void revokeMarksTokenAsLoggedOut() throws Exception {
        TbRefreshToken token = stored(NOW.plus(Duration.ofDays(6)), null, null);
        givenStored(token);

        service.revoke(RAW);

        assertThat(token.getRevokedAt()).isEqualTo(NOW);
        assertThat(token.getRevokedReason()).isEqualTo(RevokedReason.LOGOUT);
    }

    @Test
    void revokeKeepsAnEarlierRevocation() throws Exception {
        TbRefreshToken token = stored(NOW.plus(Duration.ofDays(6)), NOW.minusSeconds(10), RevokedReason.ROTATED);
        givenStored(token);

        service.revoke(RAW);

        assertThat(token.getRevokedAt()).isEqualTo(NOW.minusSeconds(10));
        assertThat(token.getRevokedReason()).isEqualTo(RevokedReason.ROTATED);
    }

    @Test
    void revokeAllDelegatesToRepository() {
        service.revokeAll(7L);

        verify(repository).revokeAllActiveByUserId(7L, NOW);
    }

    @Test
    void revokeAllExceptKeepsTheGivenToken() throws Exception {
        service.revokeAllExcept(7L, RAW);

        verify(repository).revokeAllActiveByUserIdExceptHash(7L, sha256(RAW), NOW);
    }

    @Test
    void revokeAllExceptWithoutTokenRevokesEverything() {
        service.revokeAllExcept(7L, null);

        verify(repository).revokeAllActiveByUserId(7L, NOW);
    }

    // --- Scenarios against an in-memory store that applies the repository updates like the JPQL does ---

    private final List<TbRefreshToken> rows = new ArrayList<>();

    private void useInMemoryStore() {
        lenient().when(repository.save(any(TbRefreshToken.class))).thenAnswer(inv -> {
            TbRefreshToken token = inv.getArgument(0);
            rows.add(token);
            return token;
        });
        lenient().when(repository.findByTokenHash(anyString())).thenAnswer(inv -> rows.stream()
                .filter(t -> t.getTokenHash().equals(inv.getArgument(0))).findFirst());
        lenient().when(repository.revokeAllActiveByUserId(anyLong(), any())).thenAnswer(inv -> {
            Long userId = inv.getArgument(0);
            Instant now = inv.getArgument(1);
            return revokeWhere(t -> t.getUser().getId().equals(userId) && t.getRevokedAt() == null, now);
        });
        lenient().when(repository.revokeAllActiveByUserIdExceptHash(anyLong(), anyString(), any())).thenAnswer(inv -> {
            Long userId = inv.getArgument(0);
            String keep = inv.getArgument(1);
            Instant now = inv.getArgument(2);
            return revokeWhere(t -> t.getUser().getId().equals(userId) && t.getRevokedAt() == null
                    && !t.getTokenHash().equals(keep), now);
        });
        lenient().when(repository.revokeRecentlyRotatedByUserId(anyLong(), any())).thenAnswer(inv -> {
            Long userId = inv.getArgument(0);
            Instant since = inv.getArgument(1);
            int count = 0;
            for (TbRefreshToken t : rows) {
                if (t.getUser().getId().equals(userId) && t.getRevokedReason() == RevokedReason.ROTATED
                        && !t.getRevokedAt().isBefore(since)) {
                    t.setRevokedReason(RevokedReason.REVOKED);
                    count++;
                }
            }
            return count;
        });
    }

    private int revokeWhere(Predicate<TbRefreshToken> filter, Instant now) {
        int count = 0;
        for (TbRefreshToken t : rows) {
            if (filter.test(t)) {
                t.setRevokedAt(now);
                t.setRevokedReason(RevokedReason.REVOKED);
                count++;
            }
        }
        return count;
    }

    private void assertAllRevoked() {
        assertThat(rows).isNotEmpty().allSatisfy(t -> assertThat(t.getRevokedAt()).isNotNull());
    }

    @Test
    void rotatedTokenLosesGraceWhenSuccessorLogsOut() {
        useInMemoryStore();
        String a = service.issue(user);
        String b = service.rotate(a).newRawToken();

        service.revoke(b);

        assertThatThrownBy(() -> service.rotate(a)).isInstanceOf(InvalidCredentialsException.class);
        assertThat(rows).hasSize(2);
        assertAllRevoked();
    }

    @Test
    void rotatedTokenLosesGraceWhenOtherSessionsAreRevokedOnPasswordChange() {
        useInMemoryStore();
        String a = service.issue(user);
        String b = service.rotate(a).newRawToken();

        service.revokeAllExcept(7L, b);

        assertThatThrownBy(() -> service.rotate(a)).isInstanceOf(InvalidCredentialsException.class);
        assertThat(rows).hasSize(2);
        // the kept session still works
        assertThat(service.rotate(b).newRawToken()).isNotBlank();
    }

    @Test
    void rotatedTokenLosesGraceWhenAllSessionsAreRevoked() {
        useInMemoryStore();
        String a = service.issue(user);
        String b = service.rotate(a).newRawToken();

        service.revokeAll(7L);

        assertThatThrownBy(() -> service.rotate(a)).isInstanceOf(InvalidCredentialsException.class);
        assertThatThrownBy(() -> service.rotate(b)).isInstanceOf(InvalidCredentialsException.class);
        assertThat(rows).hasSize(2);
        assertAllRevoked();
    }

    @Test
    void graceAllowsOnlyOneReuseThenRevokesAllSessions() {
        useInMemoryStore();
        String a = service.issue(user);
        String b = service.rotate(a).newRawToken();

        String c = service.rotate(a).newRawToken();
        assertThat(c).isNotBlank().isNotEqualTo(b);

        assertThatThrownBy(() -> service.rotate(a)).isInstanceOf(InvalidCredentialsException.class);
        assertThat(rows).hasSize(3);
        assertAllRevoked();
        assertThatThrownBy(() -> service.rotate(b)).isInstanceOf(InvalidCredentialsException.class);
        assertThatThrownBy(() -> service.rotate(c)).isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void rotationFailuresDoNotRollBackTheRevocation() throws Exception {
        Transactional tx = RefreshTokenService.class.getMethod("rotate", String.class)
                .getAnnotation(Transactional.class);

        assertThat(tx).isNotNull();
        assertThat(tx.noRollbackFor()).contains(InvalidCredentialsException.class);
    }
}
