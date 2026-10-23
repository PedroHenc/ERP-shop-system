package com.pedrohenc.erp.config;

import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UserRole;
import com.pedrohenc.erp.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminBootstrapTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    private void run(String email, String password) throws Exception {
        new AdminBootstrap(userRepository, passwordEncoder, email, password)
                .run(new DefaultApplicationArguments());
    }

    @Test
    void createsAdminWhenNoUsersAndVariablesSet() throws Exception {
        when(userRepository.count()).thenReturn(0L);
        when(passwordEncoder.encode("bootstrap-pass")).thenReturn("{bcrypt}hashed");

        run("  Admin@Shop.COM ", "bootstrap-pass");

        ArgumentCaptor<TbUser> captor = ArgumentCaptor.forClass(TbUser.class);
        verify(userRepository).save(captor.capture());
        TbUser saved = captor.getValue();
        assertThat(saved.getName()).isEqualTo("Administrator");
        assertThat(saved.getEmail()).isEqualTo("admin@shop.com");
        assertThat(saved.getPasswordHash()).isEqualTo("{bcrypt}hashed");
        assertThat(saved.getRole()).isEqualTo(UserRole.ADMIN);
        assertThat(saved.getActive()).isTrue();
        assertThat(saved.getFailedAttempts()).isZero();
    }

    @Test
    void doesNothingWhenUsersExist() throws Exception {
        when(userRepository.count()).thenReturn(3L);

        run("admin@shop.com", "bootstrap-pass");

        verify(userRepository, never()).save(any());
        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    void doesNothingWhenVariablesMissing() throws Exception {
        when(userRepository.count()).thenReturn(0L);

        run("", "bootstrap-pass");
        run("admin@shop.com", "  ");
        run(null, null);

        verify(userRepository, never()).save(any());
        verify(passwordEncoder, never()).encode(any());
    }
}
