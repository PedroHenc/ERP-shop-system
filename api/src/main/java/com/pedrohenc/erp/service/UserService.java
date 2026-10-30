package com.pedrohenc.erp.service;

import com.pedrohenc.erp.dto.user.UserCreateRequest;
import com.pedrohenc.erp.dto.user.UserPageRequest;
import com.pedrohenc.erp.dto.user.UserPageResponse;
import com.pedrohenc.erp.dto.user.UserResponse;
import com.pedrohenc.erp.dto.user.UserUpdateRequest;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UserRole;
import com.pedrohenc.erp.exception.FieldErrorException;
import com.pedrohenc.erp.exception.ResourceNotFoundException;
import com.pedrohenc.erp.repository.UserRepository;
import com.pedrohenc.erp.security.RefreshTokenService;
import com.pedrohenc.erp.security.UserEmails;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("name", "email", "role", "active", "lastLoginAt");
    private static final String DUPLICATE_EMAIL_MESSAGE = "A user with this email already exists";
    private static final String SELF_PROTECTION_MESSAGE = "You can't deactivate or change the role of your own account";
    private static final String LAST_ADMIN_MESSAGE = "There must be at least one active admin";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;

    @Transactional(readOnly = true)
    public UserPageResponse findPage(UserPageRequest request) {
        if (!ALLOWED_SORT_FIELDS.contains(request.sortBy())) {
            throw new IllegalArgumentException("Invalid sort field: " + request.sortBy());
        }

        Page<TbUser> result = userRepository.findAll(
                createSpecification(request),
                PageRequest.of(request.page(), request.size(), Sort.by(Sort.Direction.fromString(request.direction()), request.sortBy())
                        .and(Sort.by(Sort.Direction.ASC, "id")))
        );

        return new UserPageResponse(
                result.getContent().stream().map(UserResponse::from).toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages(),
                result.isLast()
        );
    }

    @Transactional(readOnly = true)
    public UserResponse findById(Long id) {
        return UserResponse.from(findEntityById(id));
    }

    @Transactional
    public UserResponse create(UserCreateRequest request) {
        String email = UserEmails.normalize(request.email());
        if (userRepository.existsByEmailInAnyStore(email)) {
            throw new FieldErrorException("email", DUPLICATE_EMAIL_MESSAGE);
        }

        TbUser user = new TbUser();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setRole(request.role());
        user.setActive(request.active());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public UserResponse update(long actingUserId, Long id, UserUpdateRequest request) {
        TbUser user = findEntityById(id);
        if (request.version() != null && !request.version().equals(user.getVersion())) {
            throw new ObjectOptimisticLockingFailureException(TbUser.class, id);
        }

        boolean wasActive = Boolean.TRUE.equals(user.getActive());
        checkProtectionRules(actingUserId, user, request.role(), request.active());

        String email = UserEmails.normalize(request.email());
        if (userRepository.existsByEmailInAnyStoreAndIdNot(email, id)) {
            throw new FieldErrorException("email", DUPLICATE_EMAIL_MESSAGE);
        }

        // Only profile fields are written; login bookkeeping is never touched through the versioned entity.
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setRole(request.role());
        user.setActive(request.active());
        TbUser saved = userRepository.saveAndFlush(user);
        if (wasActive && !request.active()) {
            refreshTokenService.revokeAll(id);
        }
        return UserResponse.from(saved);
    }

    @Transactional
    public UserResponse setStatus(long actingUserId, Long id, boolean active) {
        TbUser user = findEntityById(id);
        boolean wasActive = Boolean.TRUE.equals(user.getActive());
        checkProtectionRules(actingUserId, user, user.getRole(), active);

        user.setActive(active);
        TbUser saved = userRepository.saveAndFlush(user);
        if (wasActive && !active) {
            refreshTokenService.revokeAll(id);
        }
        return UserResponse.from(saved);
    }

    @Transactional
    public void setPassword(Long id, String password) {
        TbUser user = findEntityById(id);
        user.setPasswordHash(passwordEncoder.encode(password));
        userRepository.saveAndFlush(user);
        refreshTokenService.revokeAll(id);
    }

    /** Self-protection first, then the "last active admin" rule. */
    private void checkProtectionRules(long actingUserId, TbUser user, UserRole newRole, boolean newActive) {
        boolean wasActive = Boolean.TRUE.equals(user.getActive());
        boolean roleChanges = newRole != user.getRole();
        boolean deactivates = wasActive && !newActive;

        if (user.getId() != null && user.getId() == actingUserId) {
            if (roleChanges) {
                throw new FieldErrorException("role", SELF_PROTECTION_MESSAGE);
            }
            if (deactivates) {
                throw new FieldErrorException("active", SELF_PROTECTION_MESSAGE);
            }
        }

        boolean isActiveAdmin = user.getRole() == UserRole.ADMIN && wasActive;
        if (isActiveAdmin && (roleChanges || deactivates)
                && userRepository.countByRoleAndActiveTrue(UserRole.ADMIN) <= 1) {
            throw new FieldErrorException(roleChanges ? "role" : "active", LAST_ADMIN_MESSAGE);
        }
    }

    private TbUser findEntityById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    private Specification<TbUser> createSpecification(UserPageRequest request) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (StringUtils.hasText(request.search())) {
                String pattern = LikePatterns.containsIgnoreCase(request.search().trim());
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern, LikePatterns.ESCAPE),
                        cb.like(cb.lower(root.get("email")), pattern, LikePatterns.ESCAPE)
                ));
            }
            if (request.role() != null) {
                predicates.add(cb.equal(root.get("role"), request.role()));
            }
            if (request.active() != null) {
                predicates.add(cb.equal(root.get("active"), request.active()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
