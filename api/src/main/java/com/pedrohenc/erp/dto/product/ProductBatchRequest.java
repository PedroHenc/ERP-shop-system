package com.pedrohenc.erp.dto.product;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Several new products saved together (all or none); errors come back as {@code products[i].field}. */
public record ProductBatchRequest(
        @NotEmpty @Size(max = 100) List<@Valid @NotNull ProductRequest> products
) {
}
