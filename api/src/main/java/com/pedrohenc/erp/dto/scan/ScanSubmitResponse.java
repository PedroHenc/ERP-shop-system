package com.pedrohenc.erp.dto.scan;

/** What the phone shows after each code: how many the session has, and whether this one was already in it. */
public record ScanSubmitResponse(int total, boolean duplicate) {
}
