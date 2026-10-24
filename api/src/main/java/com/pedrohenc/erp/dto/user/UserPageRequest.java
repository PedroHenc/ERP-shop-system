package com.pedrohenc.erp.dto.user;

import com.pedrohenc.erp.entity.UserRole;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;

import java.util.Locale;

public record UserPageRequest(
        @Min(0) Integer page,
        @Min(1) @Max(100) Integer size,
        String sortBy,
        @Pattern(regexp = "(?i)ASC|DESC", message = "Direction must be ASC or DESC") String direction,
        String search,
        UserRole role,
        Boolean active
) {
    public UserPageRequest {
        page = page == null ? 0 : page;
        size = size == null ? 20 : size;
        sortBy = sortBy == null || sortBy.isBlank() ? "name" : sortBy;
        direction = direction == null || direction.isBlank() ? "ASC" : direction.toUpperCase(Locale.ROOT);
    }
}
