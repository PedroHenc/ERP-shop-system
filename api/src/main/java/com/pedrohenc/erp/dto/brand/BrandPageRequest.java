package com.pedrohenc.erp.dto.brand;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;

import java.util.Locale;

public record BrandPageRequest(
        @Min(0) Integer page,
        @Min(1) @Max(100) Integer size,
        String sortBy,
        @Pattern(regexp = "(?i)ASC|DESC", message = "Direction must be ASC or DESC") String direction,
        String name,
        Boolean active
) {
    public BrandPageRequest {
        page = page == null ? 0 : page;
        size = size == null ? 20 : size;
        sortBy = sortBy == null || sortBy.isBlank() ? "name" : sortBy;
        direction = direction == null || direction.isBlank() ? "ASC" : direction.toUpperCase(Locale.ROOT);
    }
}
