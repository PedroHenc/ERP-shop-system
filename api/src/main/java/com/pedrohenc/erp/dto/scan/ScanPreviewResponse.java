package com.pedrohenc.erp.dto.scan;

import java.time.Instant;

/** What the phone shows before reading: which store is waiting, until when, and whether to keep reading. */
public record ScanPreviewResponse(String storeName, Instant expiresAt, boolean batch, int total) {
}
