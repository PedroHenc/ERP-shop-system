package com.pedrohenc.erp.dto.stock;

import java.util.List;

public record StockMovementPageResponse(
        List<StockMovementResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean last
) {
}
