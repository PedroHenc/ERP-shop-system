package com.pedrohenc.erp.dto.signup;

import com.pedrohenc.erp.dto.validation.MaxUtf8Bytes;
import com.pedrohenc.erp.security.Passwords;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** A new store and its first user, who becomes the store's ADMIN. */
public record StoreSignupRequest(
        @NotBlank @Size(max = 100) String storeName,
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Email @Size(max = 150) String email,
        @NotBlank
        @Size(min = Passwords.MIN_LENGTH)
        @MaxUtf8Bytes(value = Passwords.MAX_BYTES, message = Passwords.TOO_LONG_MESSAGE)
        String password
) {
}
