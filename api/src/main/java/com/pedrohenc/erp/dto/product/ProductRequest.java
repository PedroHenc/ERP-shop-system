package com.pedrohenc.erp.dto.product;

import com.pedrohenc.erp.entity.UnitOfMeasure;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ProductRequest(
        @NotBlank @Size(max = 64) String sku,
        @Pattern(regexp = "^(\\d{8}|\\d{12,14})$", message = "Barcode must contain 8, 12, 13, or 14 digits") String barcode,
        @NotBlank @Size(max = 150) String name,
        @Size(max = 1_000) String description,
        @NotBlank @Size(max = 100) String category,
        @Size(max = 100) String subcategory,
        Long brandId,
        @NotNull @DecimalMin("0.00") BigDecimal price,
        @NotNull UnitOfMeasure unitOfMeasure,
        @NotNull @DecimalMin("0.000") BigDecimal stockQuantity,
        @NotNull @DecimalMin("0.000") BigDecimal minimumStock,
        @NotNull @DecimalMin("0.000") BigDecimal reorderPoint,
        @NotNull Boolean allowNegativeStock,
        @NotNull Boolean active,
        Long version
) {
}
