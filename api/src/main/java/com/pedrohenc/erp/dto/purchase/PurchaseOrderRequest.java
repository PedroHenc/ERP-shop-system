package com.pedrohenc.erp.dto.purchase;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/** A draft order (create or edit): each product once, with the quantity and the expected unit cost. */
public record PurchaseOrderRequest(
        @NotNull Long supplierId,
        @Size(max = 1000) String notes,
        @NotEmpty @Size(max = 200) List<@Valid @NotNull Item> items
) {

    public record Item(
            @NotNull Long productId,
            @NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal quantity,
            @NotNull @DecimalMin("0.00") BigDecimal unitCost
    ) {
    }
}
