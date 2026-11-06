package com.pedrohenc.erp.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class PurchaseOrderServiceTest {

    private static BigDecimal average(String stock, String cost, String quantity, String unitCost) {
        return PurchaseOrderService.averageCost(new BigDecimal(stock), cost == null ? null : new BigDecimal(cost),
                new BigDecimal(quantity), new BigDecimal(unitCost));
    }

    @Test
    void weighsTheStockOnHandAgainstWhatArrived() {
        assertThat(average("10", "6.00", "8", "9.00")).isEqualByComparingTo("7.33");
        assertThat(average("1.5", "4.00", "2.5", "4.40")).isEqualByComparingTo("4.25");
    }

    @Test
    void takesThePaidCostWithoutACostOrStockToAverageWith() {
        assertThat(average("10", null, "5", "3.00")).isEqualByComparingTo("3.00");
        assertThat(average("0", "6.00", "5", "3.00")).isEqualByComparingTo("3.00");
        assertThat(average("-2", "6.00", "5", "3.00")).isEqualByComparingTo("3.00");
    }
}
