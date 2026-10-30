package com.pedrohenc.erp.dto.invite;

import com.pedrohenc.erp.entity.TbInvite;
import com.pedrohenc.erp.entity.UserRole;

import java.time.Instant;

/** A pending invite. Never carries the code: only its hash is stored. */
public record InviteResponse(Long id, UserRole role, String createdByName, Instant createdAt, Instant expiresAt) {

    public static InviteResponse from(TbInvite invite) {
        return new InviteResponse(invite.getId(), invite.getRole(), invite.getCreatedBy().getName(),
                invite.getCreatedAt(), invite.getExpiresAt());
    }
}
