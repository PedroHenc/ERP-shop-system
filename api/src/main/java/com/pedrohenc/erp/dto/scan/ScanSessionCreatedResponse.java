package com.pedrohenc.erp.dto.scan;

import java.time.Instant;

/** `token` goes into the QR code; it is returned only here and never stored. */
public record ScanSessionCreatedResponse(Long id, String token, Instant expiresAt) {
}
