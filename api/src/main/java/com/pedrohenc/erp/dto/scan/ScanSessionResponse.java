package com.pedrohenc.erp.dto.scan;

import java.time.Instant;

public record ScanSessionResponse(Long id, ScanSessionStatus status, String code, Instant expiresAt) {

    public enum ScanSessionStatus {
        /** Waiting for the phone. */
        WAITING,
        /** The phone sent `code`. */
        SCANNED,
        /** Past its lifetime without a code. */
        EXPIRED
    }
}
