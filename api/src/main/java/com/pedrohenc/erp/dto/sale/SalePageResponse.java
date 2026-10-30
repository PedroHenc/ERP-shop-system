package com.pedrohenc.erp.dto.sale;

import java.util.List;

public record SalePageResponse(List<SaleSummaryResponse> content, int page, int size, long totalElements, int totalPages,
                               boolean last) {
}
