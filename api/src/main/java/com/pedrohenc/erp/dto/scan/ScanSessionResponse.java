package com.pedrohenc.erp.dto.scan;

import java.time.Instant;
import java.util.List;

/** {@code code} is a single session's barcode; {@code codes} a batch session's, in reading order. */
public record ScanSessionResponse(Long id, ScanSessionStatus status, boolean batch, String code, List<String> codes,
                                  Instant expiresAt) {

    public enum ScanSessionStatus {
        /** Waiting for the phone (a batch session stays here while it takes codes). */
        WAITING,
        /** A single session's phone sent `code`. */
        SCANNED,
        /** Past its lifetime, or closed by the screen. */
        EXPIRED
    }
}
