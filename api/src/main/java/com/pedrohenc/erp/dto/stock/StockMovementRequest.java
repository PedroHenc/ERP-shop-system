package com.pedrohenc.erp.dto.stock;

import com.pedrohenc.erp.entity.StockMovementReason;
import com.pedrohenc.erp.entity.StockMovementType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * A manual movement. `quantity` is how much comes in (ENTRY) or goes out (EXIT), always positive;
 * for an ADJUSTMENT it is the counted stock, which becomes the new balance.
 */
public record StockMovementRequest(
        @NotNull StockMovementType type,
        @NotNull StockMovementReason reason,
        @NotNull @DecimalMin("0.000") @DecimalMax("999999999.999") @Digits(integer = 9, fraction = 3) BigDecimal quantity,
        @Size(max = 500) String note
) {
}
