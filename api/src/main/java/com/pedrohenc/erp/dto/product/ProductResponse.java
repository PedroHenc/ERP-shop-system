package com.pedrohenc.erp.dto.product;

import com.pedrohenc.erp.entity.UnitOfMeasure;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ProductResponse(
        Long id,
        Long version,
        String sku,
        String barcode,
        String name,
        String description,
        String category,
        String subcategory,
        Long brandId,
        String brandName,
        BigDecimal price,
        UnitOfMeasure unitOfMeasure,
        BigDecimal stockQuantity,
        BigDecimal minimumStock,
        BigDecimal reorderPoint,
        Boolean allowNegativeStock,
        Boolean active,
        LocalDateTime createdDate,
        LocalDateTime lastModifiedDate
) {
}
