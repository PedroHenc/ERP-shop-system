package com.pedrohenc.erp.dto.brand;

import java.time.LocalDateTime;

public record BrandDetailResponse(
        Long id,
        Long version,
        String name,
        Boolean active,
        LocalDateTime createdDate,
        LocalDateTime lastModifiedDate
) {
}
