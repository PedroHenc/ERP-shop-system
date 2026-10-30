package com.pedrohenc.erp.dto.sale;

import com.pedrohenc.erp.entity.PaymentMethod;
import com.pedrohenc.erp.entity.SaleStatus;

import java.math.BigDecimal;
import java.time.Instant;

/** A row of the sales list. */
public record SaleSummaryResponse(Long id, Long number, SaleStatus status, BigDecimal total, PaymentMethod paymentMethod,
                                  long itemCount, String createdByName, Instant createdAt) {
}
