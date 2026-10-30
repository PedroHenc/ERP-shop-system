package com.pedrohenc.erp.dto.invite;

/** The new invite and its code. The code is returned only here, once; it cannot be read again later. */
public record InviteCreatedResponse(InviteResponse invite, String token) {
}
