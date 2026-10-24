package com.pedrohenc.erp.dto.dashboard;

import java.math.BigDecimal;

public record RestockItemResponse(
        Long id,
        String sku,
        String name,
        BigDecimal stockQuantity,
        BigDecimal minimumStock
) {
}
