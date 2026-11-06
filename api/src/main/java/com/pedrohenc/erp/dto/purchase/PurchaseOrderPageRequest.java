package com.pedrohenc.erp.dto.purchase;

import com.pedrohenc.erp.entity.PurchaseOrderStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** Newest first. */
public record PurchaseOrderPageRequest(
        @Min(0) Integer page,
        @Min(1) @Max(100) Integer size,
        PurchaseOrderStatus status,
        Long supplierId,
        Long number
) {
    public PurchaseOrderPageRequest {
        page = page == null ? 0 : page;
        size = size == null ? 20 : size;
    }
}
