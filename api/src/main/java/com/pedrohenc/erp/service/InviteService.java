package com.pedrohenc.erp.service;

import com.pedrohenc.erp.dto.invite.InviteCreatedResponse;
import com.pedrohenc.erp.dto.invite.InviteResponse;
import com.pedrohenc.erp.entity.TbInvite;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UserRole;
import com.pedrohenc.erp.exception.ResourceNotFoundException;
import com.pedrohenc.erp.repository.InviteRepository;
import com.pedrohenc.erp.repository.UserRepository;
import com.pedrohenc.erp.security.TokenHashes;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

/** Invites of the signed-in admin's store. The tenant filter keeps every query inside that store. */
@Service
public class InviteService {

    static final Duration INVITE_TTL = Duration.ofDays(7);
    /** 18 random bytes: a 24-character URL-safe code. */
    private static final int TOKEN_BYTES = 18;

    private final InviteRepository inviteRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    public InviteService(InviteRepository inviteRepository, UserRepository userRepository, Clock clock) {
        this.inviteRepository = inviteRepository;
        this.userRepository = userRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<InviteResponse> findPending() {
        return inviteRepository.findPending(clock.instant()).stream().map(InviteResponse::from).toList();
    }

    @Transactional
    public InviteCreatedResponse create(long actingUserId, UserRole role) {
        TbUser creator = userRepository.findById(actingUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", actingUserId));
        String token = TokenHashes.newRawToken(TOKEN_BYTES);
        Instant now = clock.instant();
        TbInvite invite = inviteRepository.save(TbInvite.builder()
                .storeId(creator.getStoreId())
                .tokenHash(TokenHashes.sha256Hex(token))
                .role(role)
                .createdBy(creator)
                .createdAt(now)
                .expiresAt(now.plus(INVITE_TTL))
                .build());
        return new InviteCreatedResponse(InviteResponse.from(invite), token);
    }

    /** Revoking an invite that was already used or revoked changes nothing. */
    @Transactional
    public void revoke(Long id) {
        TbInvite invite = inviteRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Invite", id));
        if (invite.getUsedAt() == null && invite.getRevokedAt() == null) {
            invite.setRevokedAt(clock.instant());
        }
    }
}
