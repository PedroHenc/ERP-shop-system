package com.pedrohenc.erp.dto.purchase;

import com.pedrohenc.erp.entity.UnitOfMeasure;

import java.math.BigDecimal;

/**
 * A product at or below its reorder point. {@code suggestedQuantity} brings the stock back to twice the
 * reorder point, counting what is already on order ({@code onOrder}).
 */
public record ReorderSuggestion(Long productId, String sku, String name, UnitOfMeasure unitOfMeasure, BigDecimal stockQuantity,
                                BigDecimal minimumStock, BigDecimal reorderPoint, BigDecimal onOrder,
                                BigDecimal suggestedQuantity, BigDecimal costPrice) {
}
