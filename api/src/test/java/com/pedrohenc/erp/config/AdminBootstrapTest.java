package com.pedrohenc.erp.config;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.pedrohenc.erp.entity.TbUser;
import org.slf4j.LoggerFactory;
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
    void createsAdminInStoreOne() throws Exception {
        when(userRepository.count()).thenReturn(0L);
        when(passwordEncoder.encode("bootstrap-pass")).thenReturn("{bcrypt}hashed");

        run("admin@shop.com", "bootstrap-pass");

        ArgumentCaptor<TbUser> captor = ArgumentCaptor.forClass(TbUser.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getStoreId()).isEqualTo(1L);
    }

    @Test
    void doesNothingWhenUsersExist() throws Exception {
        when(userRepository.count()).thenReturn(3L);

        run("admin@shop.com", "bootstrap-pass");

        verify(userRepository, never()).save(any());
        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    void invalidBootstrapPasswordIsRejectedWithoutLeakingIt() throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(AdminBootstrap.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            when(userRepository.count()).thenReturn(0L);
            String tooShort = "Short1!";
            String tooLong = "é".repeat(40); // 40 characters, 80 UTF-8 bytes

            run("admin@shop.com", tooShort);
            run("admin@shop.com", tooLong);

            verify(userRepository, never()).save(any());
            verify(passwordEncoder, never()).encode(any());
            assertThat(appender.list).hasSize(2).allSatisfy(event -> {
                assertThat(event.getLevel()).isEqualTo(Level.ERROR);
                assertThat(event.getFormattedMessage())
                        .contains("APP_BOOTSTRAP_ADMIN_PASSWORD")
                        .doesNotContain(tooShort)
                        .doesNotContain(tooLong);
            });
        } finally {
            logger.detachAppender(appender);
        }
    }

    @Test
    void acceptsBootstrapPasswordOfExactly72Bytes() throws Exception {
        when(userRepository.count()).thenReturn(0L);
        String password = "é".repeat(36);
        when(passwordEncoder.encode(password)).thenReturn("{bcrypt}hashed");

        run("admin@shop.com", password);

        verify(userRepository).save(any(TbUser.class));
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
