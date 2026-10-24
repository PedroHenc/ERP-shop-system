package com.pedrohenc.erp.dto.auth;

import com.pedrohenc.erp.dto.user.UserResponse;

public record AuthResponse(String accessToken, long expiresIn, UserResponse user) {
}
