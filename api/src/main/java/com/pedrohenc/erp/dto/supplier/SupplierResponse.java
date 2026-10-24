package com.pedrohenc.erp.dto.supplier;

import java.time.LocalDateTime;

public record SupplierResponse(
        Long id,
        Long version,
        String legalName,
        String tradeName,
        String taxId,
        String email,
        String phone,
        Boolean active,
        LocalDateTime createdDate,
        LocalDateTime lastModifiedDate
) {
}
