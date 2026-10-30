package com.pedrohenc.erp.dto.report;

import com.pedrohenc.erp.dto.report.StockReportResponse.ProductAmount;
import com.pedrohenc.erp.entity.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Completed sales of a period: what was charged, after discounts. Cancelled sales are left out. */
public record SalesReportResponse(
        Totals totals,
        /** One point per calendar day of the period, in the requested time zone, zeros included. */
        List<DailyPoint> daily,
        /** Best sellers by the value of their lines (after item discounts, before a discount on the whole sale); `quantity` is in each product's unit. */
        List<ProductAmount> topProducts,
        List<PaymentAmount> byPayment
) {

    public record Totals(long sales, BigDecimal revenue, BigDecimal averageTicket, BigDecimal discounts, long cancelled) {
    }

    public record DailyPoint(LocalDate date, long sales, BigDecimal revenue) {
    }

    public record PaymentAmount(PaymentMethod method, long sales, BigDecimal revenue) {
    }
}
