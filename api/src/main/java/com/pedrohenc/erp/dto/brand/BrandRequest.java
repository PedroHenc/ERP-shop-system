package com.pedrohenc.erp.dto.brand;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record BrandRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull Boolean active,
        Long version
) {
}
