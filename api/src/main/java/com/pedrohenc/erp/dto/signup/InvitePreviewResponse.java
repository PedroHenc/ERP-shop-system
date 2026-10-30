package com.pedrohenc.erp.dto.signup;

import com.pedrohenc.erp.entity.UserRole;

import java.time.Instant;

/** What someone holding a valid invite code may see before creating the account. */
public record InvitePreviewResponse(String storeName, UserRole role, Instant expiresAt) {
}
