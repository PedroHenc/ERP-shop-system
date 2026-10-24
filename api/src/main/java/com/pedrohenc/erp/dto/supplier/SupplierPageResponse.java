package com.pedrohenc.erp.dto.supplier;

import java.util.List;

public record SupplierPageResponse(
        List<SupplierResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean last
) {
}
