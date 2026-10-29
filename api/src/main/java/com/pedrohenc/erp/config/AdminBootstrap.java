package com.pedrohenc.erp.config;

import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UserRole;
import com.pedrohenc.erp.repository.UserRepository;
import com.pedrohenc.erp.security.Passwords;
import com.pedrohenc.erp.security.UserEmails;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Creates the first ADMIN on startup when the user table is empty and
 * {@code APP_BOOTSTRAP_ADMIN_EMAIL} / {@code APP_BOOTSTRAP_ADMIN_PASSWORD} are set. Never logs the password.
 */
@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String password;

    public AdminBootstrap(UserRepository userRepository, PasswordEncoder passwordEncoder,
                          @Value("${app.bootstrap.admin.email:}") String email,
                          @Value("${app.bootstrap.admin.password:}") String password) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.email = email;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
            return;
        }
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            log.warn("No users exist and APP_BOOTSTRAP_ADMIN_EMAIL / APP_BOOTSTRAP_ADMIN_PASSWORD are not set: "
                    + "nobody can sign in");
            return;
        }
        if (!Passwords.isValid(password)) {
            log.error("APP_BOOTSTRAP_ADMIN_PASSWORD must have at least {} characters and at most {} bytes; "
                    + "bootstrap admin not created", Passwords.MIN_LENGTH, Passwords.MAX_BYTES);
            return;
        }
        String normalizedEmail = UserEmails.normalize(email);
        userRepository.save(TbUser.builder()
                .storeId(1L)
                .name("Administrator")
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(password))
                .role(UserRole.ADMIN)
                .active(true)
                .build());
        log.info("Created bootstrap admin user {}", normalizedEmail);
    }
}
