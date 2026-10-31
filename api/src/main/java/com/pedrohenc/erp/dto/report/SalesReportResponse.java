package com.pedrohenc.erp.dto.report;

import com.pedrohenc.erp.entity.PaymentMethod;
import com.pedrohenc.erp.entity.UnitOfMeasure;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Completed sales of a period: what was charged, after discounts. Cancelled sales are left out. */
public record SalesReportResponse(
        Totals totals,
        /** One point per calendar day of the period, in the requested time zone, zeros included. */
        List<DailyPoint> daily,
        /** Best sellers by the value of their lines (after item discounts, before a discount on the whole sale); `quantity` is in each product's unit. */
        List<TopProduct> topProducts,
        List<PaymentAmount> byPayment,
        /** Line values by product category (null: deleted products), on the same basis as topProducts. */
        List<CategoryAmount> byCategory
) {

    /**
     * {@code costedRevenue} is the revenue of lines sold with a cost (sale-wide discounts shared out),
     * {@code cost} what they cost, {@code grossProfit} the difference and {@code margin} its share of that
     * revenue (null without any costed line). Lines without a cost are left out of all four rather than
     * counted as pure profit; {@code revenue − costedRevenue} is what they add up to.
     */
    public record Totals(long sales, BigDecimal revenue, BigDecimal averageTicket, BigDecimal discounts, long cancelled,
                         BigDecimal costedRevenue, BigDecimal cost, BigDecimal grossProfit, BigDecimal margin) {
    }

    /** {@code profit} and {@code margin} cover the lines sold with a cost; null when none had one. */
    public record TopProduct(Long productId, String name, String sku, UnitOfMeasure unitOfMeasure, BigDecimal quantity,
                             BigDecimal value, BigDecimal profit, BigDecimal margin) {
    }

    public record CategoryAmount(String category, BigDecimal revenue, BigDecimal profit, BigDecimal margin) {
    }

    public record DailyPoint(LocalDate date, long sales, BigDecimal revenue) {
    }

    public record PaymentAmount(PaymentMethod method, long sales, BigDecimal revenue) {
    }
}
