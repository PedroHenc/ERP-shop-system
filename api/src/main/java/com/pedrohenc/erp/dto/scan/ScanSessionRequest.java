package com.pedrohenc.erp.dto.scan;

/** {@code batch}: keep taking codes (several new products) instead of closing after the first. */
public record ScanSessionRequest(Boolean batch) {
}
