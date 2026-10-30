package com.pedrohenc.erp.dto.store;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** {@code logo}: a PNG, JPEG or WebP data URL; null removes it. */
public record StoreUpdateRequest(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 400_000) String logo
) {
}
