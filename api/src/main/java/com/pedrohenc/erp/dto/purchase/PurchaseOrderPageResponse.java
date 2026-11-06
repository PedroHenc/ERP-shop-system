package com.pedrohenc.erp.dto.purchase;

import java.util.List;

public record PurchaseOrderPageResponse(List<PurchaseOrderSummary> content, int page, int size, long totalElements, int totalPages,
                                        boolean last) {
}
