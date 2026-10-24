package com.pedrohenc.erp.security;

import java.nio.charset.StandardCharsets;

/** Password length rules. BCrypt only uses the first 72 BYTES, and Spring's encoder rejects longer input. */
public final class Passwords {

    public static final int MIN_LENGTH = 8;
    public static final int MAX_BYTES = 72;
    public static final String TOO_LONG_MESSAGE = "Password must be at most 72 bytes";

    private Passwords() {
    }

    public static int utf8Length(String value) {
        return value.getBytes(StandardCharsets.UTF_8).length;
    }

    /** True when {@code value} has at least 8 characters and at most 72 UTF-8 bytes. */
    public static boolean isValid(String value) {
        return value != null && value.length() >= MIN_LENGTH && utf8Length(value) <= MAX_BYTES;
    }
}
