package com.pedrohenc.erp.dto.purchase;

import com.pedrohenc.erp.entity.PurchaseOrderStatus;

import java.math.BigDecimal;
import java.time.Instant;

/** A row of the purchase order list. */
public record PurchaseOrderSummary(Long id, Long number, PurchaseOrderStatus status, Long supplierId, String supplierName,
                                   long items, BigDecimal total, BigDecimal receivedTotal, Instant createdAt,
                                   Instant receivedAt) {
}
