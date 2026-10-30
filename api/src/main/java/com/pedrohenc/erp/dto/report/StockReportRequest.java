package com.pedrohenc.erp.dto.report;

import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.Instant;

/**
 * `from` (inclusive) and `to` (exclusive) are instants computed by the browser from the user's local
 * days; `zone` (IANA, e.g. America/Sao_Paulo) groups the daily series into those same days.
 */
public record StockReportRequest(
        @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
        @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
        String zone
) {
}
