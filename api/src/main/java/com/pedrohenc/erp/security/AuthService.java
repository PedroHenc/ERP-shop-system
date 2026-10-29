package com.pedrohenc.erp.security;

import com.pedrohenc.erp.dto.auth.AuthResponse;
import com.pedrohenc.erp.dto.user.UserResponse;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.exception.FieldErrorException;
import com.pedrohenc.erp.exception.InvalidCredentialsException;
import com.pedrohenc.erp.exception.ResourceNotFoundException;
import com.pedrohenc.erp.exception.StoreSuspendedException;
import com.pedrohenc.erp.repository.StoreRepository;
import com.pedrohenc.erp.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@Service
public class AuthService {

    static final int MAX_FAILED_ATTEMPTS = 5;
    static final Duration LOCK_DURATION = Duration.ofMinutes(15);

    /**
     * Well-formed BCrypt hash of a random value. Checked when the e-mail is unknown so that the
     * response time does not reveal whether an account exists.
     */
    private static final String DUMMY_HASH =
            "{bcrypt}$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final RefreshTokenService refreshTokenService;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    public AuthService(UserRepository userRepository, StoreRepository storeRepository,
                       RefreshTokenService refreshTokenService, JwtService jwtService,
                       PasswordEncoder passwordEncoder, Clock clock) {
        this.userRepository = userRepository;
        this.storeRepository = storeRepository;
        this.refreshTokenService = refreshTokenService;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    /**
     * Unknown e-mail, wrong password, inactive or locked user all fail with the same
     * {@link InvalidCredentialsException}. {@code noRollbackFor} keeps the failure counter and the lock.
     * A suspended store is only reported ({@link StoreSuspendedException}) once the password matched,
     * and before anything is written, so the rollback it causes loses nothing.
     */
    @Transactional(noRollbackFor = InvalidCredentialsException.class)
    public LoginResult login(String email, String password) {
        Optional<TbUser> found = userRepository.findByEmail(UserEmails.normalize(email));
        if (found.isEmpty()) {
            passwordEncoder.matches(password, DUMMY_HASH);
            throw new InvalidCredentialsException();
        }
        TbUser user = found.get();
        Instant now = clock.instant();

        boolean locked = user.getLockedUntil() != null && now.isBefore(user.getLockedUntil());
        boolean passwordMatches = passwordEncoder.matches(password, user.getPasswordHash());
        if (!Boolean.TRUE.equals(user.getActive()) || locked) {
            throw new InvalidCredentialsException();
        }
        // Bookkeeping goes through bulk updates and never mutates the (versioned) entity; see UserRepository.
        if (!passwordMatches) {
            userRepository.incrementFailedAttempts(user.getId());
            userRepository.lockIfFailedAttemptsReached(user.getId(), MAX_FAILED_ATTEMPTS, now.plus(LOCK_DURATION));
            throw new InvalidCredentialsException();
        }
        requireActiveStore(user);

        userRepository.recordSuccessfulLogin(user.getId(), now);
        String refreshToken = refreshTokenService.issue(user);
        JwtService.IssuedToken access = issueAccessToken(user);
        UserResponse body = UserResponse.from(user).withLastLoginAt(now);
        return new LoginResult(new AuthResponse(access.token(), access.expiresIn(), body), refreshToken);
    }

    /** A suspended store rolls the rotation back: the presented token stays as it was. */
    @Transactional(noRollbackFor = InvalidCredentialsException.class)
    public LoginResult refresh(String rawToken) {
        RefreshTokenService.RotationResult rotation = refreshTokenService.rotate(rawToken);
        requireActiveStore(rotation.user());
        return issueSession(rotation.user(), rotation.newRawToken());
    }

    @Transactional
    public void logout(String rawTokenOrNull) {
        if (rawTokenOrNull != null && !rawTokenOrNull.isBlank()) {
            refreshTokenService.revoke(rawTokenOrNull);
        }
    }

    @Transactional(readOnly = true)
    public UserResponse me(long userId) {
        return UserResponse.from(findUser(userId));
    }

    /** Changes the password and revokes every other session, keeping the one in {@code currentRawRefreshOrNull}. */
    @Transactional
    public void changePassword(long userId, String currentRawRefreshOrNull, String current, String next) {
        TbUser user = findUser(userId);
        if (current == null || !passwordEncoder.matches(current, user.getPasswordHash())) {
            throw new FieldErrorException("currentPassword", "Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(next));
        refreshTokenService.revokeAllExcept(user.getId(), currentRawRefreshOrNull);
    }

    private LoginResult issueSession(TbUser user, String refreshToken) {
        JwtService.IssuedToken access = issueAccessToken(user);
        return new LoginResult(new AuthResponse(access.token(), access.expiresIn(), UserResponse.from(user)),
                refreshToken);
    }

    private JwtService.IssuedToken issueAccessToken(TbUser user) {
        return jwtService.issueAccessToken(user.getId(), user.getEmail(), user.getRole(), user.getStoreId());
    }

    /** A missing store (cannot happen with the foreign key) is treated as suspended. */
    private void requireActiveStore(TbUser user) {
        boolean active = storeRepository.findById(user.getStoreId())
                .map(store -> Boolean.TRUE.equals(store.getActive()))
                .orElse(false);
        if (!active) {
            throw new StoreSuspendedException();
        }
    }

    private TbUser findUser(long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId));
    }

    public record LoginResult(AuthResponse body, String refreshToken) {
    }
}
