package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.dto.auth.AuthResponse;
import com.pedrohenc.erp.dto.signup.InviteAcceptRequest;
import com.pedrohenc.erp.dto.signup.InvitePreviewResponse;
import com.pedrohenc.erp.dto.signup.InviteTokenRequest;
import com.pedrohenc.erp.dto.signup.StoreSignupRequest;
import com.pedrohenc.erp.security.AuthService;
import com.pedrohenc.erp.security.RefreshCookies;
import com.pedrohenc.erp.service.SignupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public account creation. Both sign-ups answer like {@code POST /auth/login}: tokens plus the refresh cookie. */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class SignupController {

    private final SignupService signupService;
    private final RefreshCookies refreshCookies;

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signUpStore(@Valid @RequestBody StoreSignupRequest request) {
        return withRefreshCookie(signupService.signUpStore(request));
    }

    @PostMapping("/invite/preview")
    public InvitePreviewResponse previewInvite(@Valid @RequestBody InviteTokenRequest request) {
        return signupService.previewInvite(request.token());
    }

    @PostMapping("/invite/accept")
    public ResponseEntity<AuthResponse> acceptInvite(@Valid @RequestBody InviteAcceptRequest request) {
        return withRefreshCookie(signupService.acceptInvite(request));
    }

    private ResponseEntity<AuthResponse> withRefreshCookie(AuthService.LoginResult result) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookies.create(result.refreshToken()).toString())
                .body(result.body());
    }
}
