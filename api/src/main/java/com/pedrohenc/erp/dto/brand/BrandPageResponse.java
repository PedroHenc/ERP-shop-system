package com.pedrohenc.erp.dto.brand;

import java.util.List;

public record BrandPageResponse(
        List<BrandDetailResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean last
) {
}
