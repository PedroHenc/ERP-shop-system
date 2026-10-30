package com.pedrohenc.erp.service;

import com.pedrohenc.erp.dto.signup.InviteAcceptRequest;
import com.pedrohenc.erp.dto.signup.StoreSignupRequest;
import com.pedrohenc.erp.entity.TbInvite;
import com.pedrohenc.erp.entity.TbStore;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UserRole;
import com.pedrohenc.erp.exception.InvalidInviteException;
import com.pedrohenc.erp.exception.SignupDisabledException;
import com.pedrohenc.erp.repository.InviteRepository;
import com.pedrohenc.erp.repository.StoreRepository;
import com.pedrohenc.erp.repository.UserRepository;
import com.pedrohenc.erp.security.AuthService;
import com.pedrohenc.erp.security.TokenHashes;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SignupServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-30T12:00:00Z");

    @Mock
    private StoreRepository storeRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private InviteRepository inviteRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthService authService;

    private SignupService service(boolean storeSignupEnabled) {
        return new SignupService(storeRepository, userRepository, inviteRepository, passwordEncoder, authService,
                Clock.fixed(NOW, ZoneOffset.UTC), storeSignupEnabled);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void storeSignupIsRefusedWhenDisabled() {
        StoreSignupRequest request = new StoreSignupRequest("Loja", "Ana", "ana@shop.com", "secret-pass");

        assertThatThrownBy(() -> service(false).signUpStore(request)).isInstanceOf(SignupDisabledException.class);
        verifyNoInteractions(storeRepository, userRepository, authService);
    }

    @Test
    void acceptRollsBackWhenAConcurrentRequestUsedTheInviteFirst() {
        TbInvite invite = TbInvite.builder().id(5L).storeId(9L).role(UserRole.CASHIER)
                .expiresAt(NOW.plusSeconds(60)).build();
        when(inviteRepository.findByTokenHash(TokenHashes.sha256Hex("code"))).thenReturn(Optional.of(invite));
        when(storeRepository.findById(9L)).thenReturn(Optional.of(TbStore.builder().id(9L).name("Loja").active(true).build()));
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        when(userRepository.save(any(TbUser.class))).thenAnswer(call -> call.getArgument(0));
        when(inviteRepository.markUsed(eq(5L), any(TbUser.class), eq(NOW))).thenReturn(0);

        InviteAcceptRequest request = new InviteAcceptRequest("code", "Bia", "bia@shop.com", "secret-pass");
        assertThatThrownBy(() -> service(true).acceptInvite(request)).isInstanceOf(InvalidInviteException.class);
        verify(authService, never()).startSession(any());
    }

    @Test
    void anInviteExpiringNowIsInvalid() {
        TbInvite invite = TbInvite.builder().id(5L).storeId(9L).role(UserRole.CASHIER).expiresAt(NOW).build();
        when(inviteRepository.findByTokenHash(TokenHashes.sha256Hex("code"))).thenReturn(Optional.of(invite));

        assertThatThrownBy(() -> service(true).previewInvite("code")).isInstanceOf(InvalidInviteException.class);
    }
}
