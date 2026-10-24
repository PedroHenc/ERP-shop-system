package com.pedrohenc.erp.dto.dashboard;

import java.math.BigDecimal;
import java.util.List;

public record DashboardSummaryResponse(
        long activeProducts,
        long lowStock,
        long outOfStock,
        BigDecimal inventoryValue,
        long activeBrands,
        Long activeSuppliers,
        List<RestockItemResponse> restock
) {
}
