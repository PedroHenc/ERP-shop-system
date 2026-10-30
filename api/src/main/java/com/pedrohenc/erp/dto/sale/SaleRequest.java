package com.pedrohenc.erp.dto.sale;

import com.pedrohenc.erp.entity.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/**
 * A sale as the cashier closes it. Prices are not sent: the API charges each product's current price.
 * `amountPaid` is required for CASH (it may exceed the total: the difference is the change) and ignored otherwise.
 */
public record SaleRequest(
        @NotEmpty @Size(max = 200) List<@Valid @NotNull Item> items,
        @DecimalMin("0.00") @Digits(integer = 15, fraction = 2) BigDecimal discount,
        @NotNull PaymentMethod paymentMethod,
        @DecimalMin("0.00") @Digits(integer = 15, fraction = 2) BigDecimal amountPaid,
        @Size(max = 500) String note
) {

    public record Item(
            @NotNull Long productId,
            @NotNull @DecimalMin(value = "0.000", inclusive = false) @Digits(integer = 9, fraction = 3) BigDecimal quantity,
            @DecimalMin("0.00") @Digits(integer = 15, fraction = 2) BigDecimal discount
    ) {
    }
}
