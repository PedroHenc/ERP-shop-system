package com.pedrohenc.erp.service;

import com.pedrohenc.erp.dto.user.UserCreateRequest;
import com.pedrohenc.erp.dto.user.UserPageRequest;
import com.pedrohenc.erp.dto.user.UserUpdateRequest;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UserRole;
import com.pedrohenc.erp.exception.FieldErrorException;
import com.pedrohenc.erp.repository.UserRepository;
import com.pedrohenc.erp.security.RefreshTokenService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    private static final String DUPLICATE = "A user with this email already exists";
    private static final String SELF = "You can't deactivate or change the role of your own account";
    private static final String LAST_ADMIN = "There must be at least one active admin";

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Spy
    private PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);

    @InjectMocks
    private UserService userService;

    private static TbUser user(long id, UserRole role, boolean active, Long version) {
        TbUser user = new TbUser();
        user.setId(id);
        user.setName("User " + id);
        user.setEmail("u" + id + "@x.com");
        user.setPasswordHash("hash");
        user.setRole(role);
        user.setActive(active);
        user.setVersion(version);
        return user;
    }

    private static UserUpdateRequest update(UserRole role, boolean active, Long version) {
        return new UserUpdateRequest("Name", "u1@x.com", role, active, version);
    }

    @Test
    void createNormalizesEmailAndRejectsDuplicate() {
        when(userRepository.existsByEmailInAnyStore("bob@x.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.create(
                new UserCreateRequest("Bob", " Bob@X.com ", UserRole.CASHIER, true, "password123")))
                .isInstanceOfSatisfying(FieldErrorException.class, e -> {
                    assertThat(e.getField()).isEqualTo("email");
                    assertThat(e.getMessage()).isEqualTo(DUPLICATE);
                });
        verify(userRepository, never()).save(any());
    }

    @Test
    void createRejectsEmailUsedInAnotherStore() {
        when(userRepository.existsByEmailInAnyStore("carol@x.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.create(
                new UserCreateRequest("Carol", "carol@x.com", UserRole.CASHIER, true, "password123")))
                .isInstanceOfSatisfying(FieldErrorException.class, e -> {
                    assertThat(e.getField()).isEqualTo("email");
                    assertThat(e.getMessage()).isEqualTo(DUPLICATE);
                });
        verify(userRepository, never()).save(any());
    }

    @Test
    void updateRejectsEmailUsedInAnotherStore() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user(1, UserRole.CASHIER, true, 0L)));
        when(userRepository.existsByEmailInAnyStoreAndIdNot("u1@x.com", 1L)).thenReturn(true);

        assertThatThrownBy(() -> userService.update(2L, 1L, update(UserRole.CASHIER, true, 0L)))
                .isInstanceOfSatisfying(FieldErrorException.class, e -> {
                    assertThat(e.getField()).isEqualTo("email");
                    assertThat(e.getMessage()).isEqualTo(DUPLICATE);
                });
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void createHashesPassword() {
        when(userRepository.existsByEmailInAnyStore("bob@x.com")).thenReturn(false);
        when(userRepository.save(any(TbUser.class))).thenAnswer(i -> i.getArgument(0));

        userService.create(new UserCreateRequest("Bob", " Bob@X.com ", UserRole.CASHIER, true, "password123"));

        ArgumentCaptor<TbUser> captor = ArgumentCaptor.forClass(TbUser.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getEmail()).isEqualTo("bob@x.com");
        assertThat(captor.getValue().getPasswordHash()).isNotEqualTo("password123");
        assertThat(passwordEncoder.matches("password123", captor.getValue().getPasswordHash())).isTrue();
    }

    @Test
    void adminCannotDeactivateSelfViaStatus() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user(1, UserRole.ADMIN, true, 0L)));

        assertThatThrownBy(() -> userService.setStatus(1L, 1L, false))
                .isInstanceOfSatisfying(FieldErrorException.class, e -> {
                    assertThat(e.getField()).isEqualTo("active");
                    assertThat(e.getMessage()).isEqualTo(SELF);
                });
    }

    @Test
    void adminCannotChangeOwnRoleViaUpdate() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user(1, UserRole.ADMIN, true, 0L)));

        assertThatThrownBy(() -> userService.update(1L, 1L, update(UserRole.MANAGER, true, 0L)))
                .isInstanceOfSatisfying(FieldErrorException.class, e -> {
                    assertThat(e.getField()).isEqualTo("role");
                    assertThat(e.getMessage()).isEqualTo(SELF);
                });
    }

    @Test
    void cannotDemoteLastActiveAdminViaUpdate() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user(1, UserRole.ADMIN, true, 0L)));
        when(userRepository.countByRoleAndActiveTrue(UserRole.ADMIN)).thenReturn(1L);

        assertThatThrownBy(() -> userService.update(2L, 1L, update(UserRole.MANAGER, true, 0L)))
                .isInstanceOfSatisfying(FieldErrorException.class, e -> {
                    assertThat(e.getField()).isEqualTo("role");
                    assertThat(e.getMessage()).isEqualTo(LAST_ADMIN);
                });
    }

    @Test
    void cannotDeactivateLastActiveAdminViaUpdate() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user(1, UserRole.ADMIN, true, 0L)));
        when(userRepository.countByRoleAndActiveTrue(UserRole.ADMIN)).thenReturn(1L);

        assertThatThrownBy(() -> userService.update(2L, 1L, update(UserRole.ADMIN, false, 0L)))
                .isInstanceOfSatisfying(FieldErrorException.class, e -> {
                    assertThat(e.getField()).isEqualTo("active");
                    assertThat(e.getMessage()).isEqualTo(LAST_ADMIN);
                });
    }

    @Test
    void deactivatingRevokesSessions() {
        when(userRepository.findById(5L)).thenReturn(Optional.of(user(5, UserRole.CASHIER, true, 0L)));
        when(userRepository.saveAndFlush(any(TbUser.class))).thenAnswer(i -> i.getArgument(0));

        userService.setStatus(1L, 5L, false);

        verify(refreshTokenService).revokeAll(5L);
    }

    @Test
    void setPasswordHashesAndRevokesSessions() {
        TbUser target = user(5, UserRole.CASHIER, true, 0L);
        when(userRepository.findById(5L)).thenReturn(Optional.of(target));

        userService.setPassword(5L, "newpassword1");

        assertThat(passwordEncoder.matches("newpassword1", target.getPasswordHash())).isTrue();
        verify(userRepository).saveAndFlush(target);
        verify(refreshTokenService).revokeAll(5L);
    }

    @Test
    void staleVersionThrowsConflict() {
        when(userRepository.findById(5L)).thenReturn(Optional.of(user(5, UserRole.CASHIER, true, 3L)));

        assertThatThrownBy(() -> userService.update(1L, 5L, update(UserRole.CASHIER, true, 2L)))
                .isInstanceOf(ObjectOptimisticLockingFailureException.class);
        verify(userRepository, never()).saveAndFlush(any());
    }

    @SuppressWarnings("unchecked")
    @Test
    void findPageAppendsIdTiebreaker() {
        when(userRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<TbUser>(List.of()));

        userService.findPage(new UserPageRequest(null, null, "role", "DESC", null, null, null));

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(userRepository).findAll(any(Specification.class), captor.capture());
        assertThat(captor.getValue().getSort()).containsExactly(Sort.Order.desc("role"), Sort.Order.asc("id"));
    }
}
