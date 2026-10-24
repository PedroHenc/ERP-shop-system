package com.pedrohenc.erp.dto.auth;

import com.pedrohenc.erp.dto.validation.MaxUtf8Bytes;
import com.pedrohenc.erp.security.Passwords;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank String email,
        @NotBlank @MaxUtf8Bytes(value = Passwords.MAX_BYTES, message = Passwords.TOO_LONG_MESSAGE) String password
) {
}
