package com.pedrohenc.erp.service;

import com.pedrohenc.erp.dto.signup.InviteAcceptRequest;
import com.pedrohenc.erp.dto.signup.InvitePreviewResponse;
import com.pedrohenc.erp.dto.signup.StoreSignupRequest;
import com.pedrohenc.erp.entity.TbInvite;
import com.pedrohenc.erp.entity.TbStore;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UserRole;
import com.pedrohenc.erp.exception.FieldErrorException;
import com.pedrohenc.erp.exception.InvalidInviteException;
import com.pedrohenc.erp.exception.SignupDisabledException;
import com.pedrohenc.erp.repository.InviteRepository;
import com.pedrohenc.erp.repository.StoreRepository;
import com.pedrohenc.erp.repository.UserRepository;
import com.pedrohenc.erp.security.AuthService;
import com.pedrohenc.erp.security.TokenHashes;
import com.pedrohenc.erp.security.UserEmails;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;

/**
 * Public account creation: a new store with its first ADMIN, or joining an existing store through an
 * invite. Both run anonymously, i.e. as the root tenant, which keeps the store id assigned here on insert.
 */
@Service
public class SignupService {

    static final String DUPLICATE_EMAIL_MESSAGE = "A user with this email already exists";
    static final String SIGNED_IN_MESSAGE = "Sign out before creating an account";

    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final InviteRepository inviteRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;
    private final Clock clock;
    private final boolean storeSignupEnabled;

    public SignupService(StoreRepository storeRepository, UserRepository userRepository,
                         InviteRepository inviteRepository, PasswordEncoder passwordEncoder,
                         AuthService authService, Clock clock,
                         @Value("${app.signup.enabled:true}") boolean storeSignupEnabled) {
        this.storeRepository = storeRepository;
        this.userRepository = userRepository;
        this.inviteRepository = inviteRepository;
        this.passwordEncoder = passwordEncoder;
        this.authService = authService;
        this.clock = clock;
        this.storeSignupEnabled = storeSignupEnabled;
    }

    /** Creates the store and its ADMIN, then signs them in. */
    @Transactional
    public AuthService.LoginResult signUpStore(StoreSignupRequest request) {
        if (!storeSignupEnabled) {
            throw new SignupDisabledException();
        }
        requireAnonymous();
        String email = requireUnusedEmail(request.email());

        TbStore store = storeRepository.save(TbStore.builder().name(request.storeName().trim()).build());
        TbUser admin = createUser(store.getId(), request.name(), email, request.password(), UserRole.ADMIN);
        return authService.startSession(admin);
    }

    @Transactional(readOnly = true)
    public InvitePreviewResponse previewInvite(String rawToken) {
        TbInvite invite = findPendingInvite(rawToken);
        TbStore store = findActiveStore(invite);
        return new InvitePreviewResponse(store.getName(), invite.getRole(), invite.getExpiresAt());
    }

    /** Creates the user in the invite's store with the invite's role, uses up the invite, and signs them in. */
    @Transactional
    public AuthService.LoginResult acceptInvite(InviteAcceptRequest request) {
        requireAnonymous();
        TbInvite invite = findPendingInvite(request.token());
        findActiveStore(invite);
        String email = requireUnusedEmail(request.email());

        TbUser user = createUser(invite.getStoreId(), request.name(), email, request.password(), invite.getRole());
        // Conditional update: if a concurrent request used the invite first, roll this account back.
        if (inviteRepository.markUsed(invite.getId(), user, clock.instant()) == 0) {
            throw new InvalidInviteException();
        }
        return authService.startSession(user);
    }

    private TbUser createUser(Long storeId, String name, String email, String password, UserRole role) {
        return userRepository.save(TbUser.builder()
                .storeId(storeId)
                .name(name.trim())
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .role(role)
                .active(true)
                .build());
    }

    private String requireUnusedEmail(String rawEmail) {
        String email = UserEmails.normalize(rawEmail);
        if (userRepository.existsByEmailInAnyStore(email)) {
            throw new FieldErrorException("email", DUPLICATE_EMAIL_MESSAGE);
        }
        return email;
    }

    private TbInvite findPendingInvite(String rawToken) {
        Instant now = clock.instant();
        return inviteRepository.findByTokenHash(TokenHashes.sha256Hex(rawToken.trim()))
                .filter(invite -> invite.getUsedAt() == null && invite.getRevokedAt() == null)
                .filter(invite -> now.isBefore(invite.getExpiresAt()))
                .orElseThrow(InvalidInviteException::new);
    }

    /** An invite to a suspended store is reported as invalid, like any other unusable invite. */
    private TbStore findActiveStore(TbInvite invite) {
        return storeRepository.findById(invite.getStoreId())
                .filter(store -> Boolean.TRUE.equals(store.getActive()))
                .orElseThrow(InvalidInviteException::new);
    }

    /**
     * A signed-in request runs as its own store's tenant, which would put the new user in that store
     * instead of the intended one. Account creation is for signed-out visitors only.
     */
    private static void requireAnonymous() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && !(authentication instanceof AnonymousAuthenticationToken)
                && authentication.isAuthenticated()) {
            throw new IllegalArgumentException(SIGNED_IN_MESSAGE);
        }
    }
}
