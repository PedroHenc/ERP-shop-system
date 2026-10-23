package com.pedrohenc.erp.dto.supplier;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SupplierRequest(
        @NotBlank @Size(max = 150) String legalName,
        @Size(max = 150) String tradeName,
        @Size(max = 32) String taxId,
        @Email @Size(max = 150) String email,
        @Size(max = 20) String phone,
        @NotNull Boolean active,
        Long version
) {
}
