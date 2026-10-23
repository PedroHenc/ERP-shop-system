package com.pedrohenc.erp.dto.user;

import java.util.List;

public record UserPageResponse(
        List<UserResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean last
) {
}
