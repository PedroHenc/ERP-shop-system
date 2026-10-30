package com.pedrohenc.erp.dto.signup;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The invite code travels in the body, not the URL, so it stays out of access logs. */
public record InviteTokenRequest(@NotBlank @Size(max = 100) String token) {
}
