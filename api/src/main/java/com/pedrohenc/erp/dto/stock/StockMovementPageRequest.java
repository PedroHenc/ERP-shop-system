package com.pedrohenc.erp.dto.stock;

import com.pedrohenc.erp.entity.StockMovementType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.Instant;

/**
 * Newest first. `from` (inclusive) and `to` (exclusive) are instants: the browser turns the user's
 * local days into them, so "today" means the user's today.
 */
public record StockMovementPageRequest(
        @Min(0) Integer page,
        @Min(1) @Max(100) Integer size,
        Long productId,
        StockMovementType type,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
) {
    public StockMovementPageRequest {
        page = page == null ? 0 : page;
        size = size == null ? 20 : size;
    }
}
