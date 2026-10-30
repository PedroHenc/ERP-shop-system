package com.pedrohenc.erp.dto.scan;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ScanTokenRequest(@NotBlank @Size(max = 64) String token) {
}
