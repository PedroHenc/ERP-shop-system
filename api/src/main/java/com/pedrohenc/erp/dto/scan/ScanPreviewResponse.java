package com.pedrohenc.erp.dto.scan;

import java.time.Instant;

/** What the phone shows before reading: which store is waiting, and until when. */
public record ScanPreviewResponse(String storeName, Instant expiresAt) {
}
