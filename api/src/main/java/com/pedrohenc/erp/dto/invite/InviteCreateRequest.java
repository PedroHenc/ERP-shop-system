package com.pedrohenc.erp.dto.invite;

import com.pedrohenc.erp.entity.UserRole;
import jakarta.validation.constraints.NotNull;

public record InviteCreateRequest(@NotNull UserRole role) {
}
