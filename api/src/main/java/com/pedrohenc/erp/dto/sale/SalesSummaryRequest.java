package com.pedrohenc.erp.dto.sale;

import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.Instant;

/** `from` (inclusive) and `to` (exclusive): instants from the user's local days. */
public record SalesSummaryRequest(
        @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
        @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
) {
}
