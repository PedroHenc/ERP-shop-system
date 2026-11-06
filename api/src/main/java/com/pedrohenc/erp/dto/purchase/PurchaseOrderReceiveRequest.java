package com.pedrohenc.erp.dto.purchase;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

/**
 * What arrived, for every item of the order: the quantity (0 when nothing came) and the cost actually
 * paid. {@code updateCosts} (default true) moves each product's cost to the weighted average with it.
 */
public record PurchaseOrderReceiveRequest(
        @NotEmpty List<@Valid @NotNull Item> items,
        Boolean updateCosts
) {

    public record Item(
            @NotNull Long itemId,
            @NotNull @DecimalMin("0") BigDecimal receivedQuantity,
            @NotNull @DecimalMin("0.00") BigDecimal unitCost
    ) {
    }
}
