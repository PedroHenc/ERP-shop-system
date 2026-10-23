package com.pedrohenc.erp.dto.user;

import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UserRole;

import java.time.Instant;
import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        Long version,
        String name,
        String email,
        UserRole role,
        Boolean active,
        Instant lastLoginAt,
        LocalDateTime createdDate,
        LocalDateTime lastModifiedDate
) {

    public static UserResponse from(TbUser user) {
        return new UserResponse(user.getId(), user.getVersion(), user.getName(), user.getEmail(), user.getRole(),
                user.getActive(), user.getLastLoginAt(), user.getCreatedDate(), user.getLastModifiedDate());
    }
}
