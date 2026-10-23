package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.dto.auth.AuthResponse;
import com.pedrohenc.erp.dto.auth.ChangePasswordRequest;
import com.pedrohenc.erp.dto.auth.LoginRequest;
import com.pedrohenc.erp.dto.user.UserResponse;
import com.pedrohenc.erp.exception.InvalidCredentialsException;
import com.pedrohenc.erp.security.AuthService;
import com.pedrohenc.erp.security.ProblemDetailAuthHandlers;
import com.pedrohenc.erp.security.RefreshCookies;
import com.pedrohenc.erp.security.Roles;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    static final String X_REQUESTED_WITH = "X-Requested-With";

    private final AuthService authService;
    private final RefreshCookies refreshCookies;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthService.LoginResult result = authService.login(request.email(), request.password());
        return withRefreshCookie(result);
    }

    /** The required {@code X-Requested-With} header is a CSRF guard for the cookie-authenticated endpoints. */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestHeader(X_REQUESTED_WITH) String requestedWith,
                                     @CookieValue(name = RefreshCookies.NAME, required = false) String rawToken) {
        try {
            return withRefreshCookie(authService.refresh(rawToken));
        } catch (InvalidCredentialsException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .header(HttpHeaders.SET_COOKIE, refreshCookies.clear().toString())
                    .body(ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED,
                            ProblemDetailAuthHandlers.UNAUTHORIZED_DETAIL));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(X_REQUESTED_WITH) String requestedWith,
                                       @CookieValue(name = RefreshCookies.NAME, required = false) String rawToken) {
        authService.logout(rawToken);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, refreshCookies.clear().toString())
                .build();
    }

    @PreAuthorize(Roles.ANY)
    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal Jwt jwt) {
        return authService.me(Long.parseLong(jwt.getSubject()));
    }

    @PreAuthorize(Roles.ANY)
    @PutMapping("/me/password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal Jwt jwt,
                                               @CookieValue(name = RefreshCookies.NAME, required = false) String rawToken,
                                               @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(Long.parseLong(jwt.getSubject()), rawToken,
                request.currentPassword(), request.newPassword());
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    public ProblemDetail handleMissingHeader(MissingRequestHeaderException ex) {
        if (X_REQUESTED_WITH.equalsIgnoreCase(ex.getHeaderName())) {
            return ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, ProblemDetailAuthHandlers.FORBIDDEN_DETAIL);
        }
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Missing header " + ex.getHeaderName());
    }

    private ResponseEntity<AuthResponse> withRefreshCookie(AuthService.LoginResult result) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookies.create(result.refreshToken()).toString())
                .body(result.body());
    }
}
