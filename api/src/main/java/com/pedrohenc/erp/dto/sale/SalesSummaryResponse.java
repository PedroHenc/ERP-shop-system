package com.pedrohenc.erp.dto.sale;

import java.math.BigDecimal;

/** Completed sales of a period (cancelled ones only counted apart). */
public record SalesSummaryResponse(long sales, BigDecimal revenue, BigDecimal averageTicket, long cancelled) {
}
