package com.pedrohenc.erp.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/** Opaque secrets (refresh tokens, invite codes): random URL-safe values stored only as SHA-256 hashes. */
public final class TokenHashes {

    private static final SecureRandom RANDOM = new SecureRandom();

    private TokenHashes() {
    }

    /** A random URL-safe Base64 value from {@code bytes} random bytes, without padding. */
    public static String newRawToken(int bytes) {
        byte[] value = new byte[bytes];
        RANDOM.nextBytes(value);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }

    /** SHA-256 of the raw value, lowercase hex (64 characters). */
    public static String sha256Hex(String raw) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
