package com.pedrohenc.erp.dto.scan;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Any printable code a reader returns (EAN, UPC, Code 128, a QR's text), trimmed; at most 64 characters. */
public record ScanSubmitRequest(
        @NotBlank @Size(max = 64) String token,
        @NotBlank @Size(max = 64) @Pattern(regexp = "^[\\x21-\\x7E]+$", message = "The code has characters a barcode cannot have") String code
) {
    /** Readers and keyboards may add spaces around the code: they are not part of it. */
    public ScanSubmitRequest {
        token = token == null ? null : token.trim();
        code = code == null ? null : code.trim();
    }
}
