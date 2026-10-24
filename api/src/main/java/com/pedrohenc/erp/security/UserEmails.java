package com.pedrohenc.erp.security;

import java.util.Locale;

public final class UserEmails {

    private UserEmails() {
    }

    public static String normalize(String raw) {
        return raw == null ? null : raw.trim().toLowerCase(Locale.ROOT);
    }
}
