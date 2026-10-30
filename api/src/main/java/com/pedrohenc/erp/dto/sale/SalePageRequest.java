package com.pedrohenc.erp.dto.sale;

import com.pedrohenc.erp.entity.PaymentMethod;
import com.pedrohenc.erp.entity.SaleStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.Instant;

/** Newest first. `from` (inclusive) and `to` (exclusive) are instants from the user's local days. */
public record SalePageRequest(
        @Min(0) Integer page,
        @Min(1) @Max(100) Integer size,
        SaleStatus status,
        PaymentMethod paymentMethod,
        Long number,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
) {
    public SalePageRequest {
        page = page == null ? 0 : page;
        size = size == null ? 20 : size;
    }
}
