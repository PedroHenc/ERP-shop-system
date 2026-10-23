package com.pedrohenc.erp.dto.user;

import com.pedrohenc.erp.dto.validation.MaxUtf8Bytes;
import com.pedrohenc.erp.security.Passwords;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SetPasswordRequest(
        @NotBlank
        @Size(min = Passwords.MIN_LENGTH)
        @MaxUtf8Bytes(value = Passwords.MAX_BYTES, message = Passwords.TOO_LONG_MESSAGE)
        String password
) {
}
