package com.pedrohenc.erp.dto.user;

import com.pedrohenc.erp.dto.validation.MaxUtf8Bytes;
import com.pedrohenc.erp.entity.UserRole;
import com.pedrohenc.erp.security.Passwords;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UserCreateRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Email @Size(max = 150) String email,
        @NotNull UserRole role,
        @NotNull Boolean active,
        @NotBlank
        @Size(min = Passwords.MIN_LENGTH)
        @MaxUtf8Bytes(value = Passwords.MAX_BYTES, message = Passwords.TOO_LONG_MESSAGE)
        String password
) {
}
