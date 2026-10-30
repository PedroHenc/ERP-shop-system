package com.pedrohenc.erp.dto.report;

import com.pedrohenc.erp.entity.StockMovementReason;
import com.pedrohenc.erp.entity.StockMovementType;
import com.pedrohenc.erp.entity.UnitOfMeasure;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Stock activity over a period. Values are quantity × the product's current sale price (the system
 * has no cost price yet), so they size movements against each other rather than account for them.
 */
public record StockReportResponse(
        Totals totals,
        /** One point per calendar day of the period, in the requested time zone, zeros included. */
        List<DailyPoint> daily,
        /** Products that left stock the most through exits (sales, losses…), by value. */
        List<ProductAmount> topExits,
        /** Losses, damage and negative adjustments, by product and value. */
        List<ProductAmount> losses,
        List<ReasonAmount> byReason,
        /** Today's stock of the active products, by category: not limited to the period. */
        List<CategoryValue> stockByCategory
) {

    public record Totals(long movements, long entries, long exits, long adjustments, BigDecimal valueIn, BigDecimal valueOut) {
    }

    public record DailyPoint(LocalDate date, BigDecimal valueIn, BigDecimal valueOut) {
    }

    public record ProductAmount(Long productId, String name, String sku, UnitOfMeasure unitOfMeasure, BigDecimal quantity,
                                BigDecimal value) {
    }

    public record ReasonAmount(StockMovementType type, StockMovementReason reason, long movements, BigDecimal value) {
    }

    public record CategoryValue(String category, long products, BigDecimal value) {
    }
}
