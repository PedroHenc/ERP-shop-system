package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.dto.scan.ScanPreviewResponse;
import com.pedrohenc.erp.dto.scan.ScanSessionCreatedResponse;
import com.pedrohenc.erp.dto.scan.ScanSessionRequest;
import com.pedrohenc.erp.dto.scan.ScanSessionResponse;
import com.pedrohenc.erp.dto.scan.ScanSubmitRequest;
import com.pedrohenc.erp.dto.scan.ScanSubmitResponse;
import com.pedrohenc.erp.dto.scan.ScanTokenRequest;
import com.pedrohenc.erp.security.Roles;
import com.pedrohenc.erp.service.ScanSessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class ScanSessionController {

    private final ScanSessionService scanSessionService;

    /** Opened by a screen that waits for a barcode (for now, a new product). */
    @PreAuthorize(Roles.CATALOG_WRITE)
    @PostMapping("/scan-sessions")
    @ResponseStatus(HttpStatus.CREATED)
    public ScanSessionCreatedResponse create(@AuthenticationPrincipal Jwt jwt,
                                             @RequestBody(required = false) ScanSessionRequest request) {
        boolean batch = request != null && Boolean.TRUE.equals(request.batch());
        return scanSessionService.create(Long.parseLong(jwt.getSubject()), batch);
    }

    @PreAuthorize(Roles.CATALOG_WRITE)
    @GetMapping("/scan-sessions/{id}")
    public ScanSessionResponse find(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return scanSessionService.find(Long.parseLong(jwt.getSubject()), id);
    }

    /** Ends a batch session early, when the screen moves on. */
    @PreAuthorize(Roles.CATALOG_WRITE)
    @PostMapping("/scan-sessions/{id}/close")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void close(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        scanSessionService.close(Long.parseLong(jwt.getSubject()), id);
    }

    /** Public: the phone, not signed in, checks the QR code's token. */
    @PostMapping("/scan/preview")
    public ScanPreviewResponse preview(@Valid @RequestBody ScanTokenRequest request) {
        return scanSessionService.preview(request.token());
    }

    /** Public: the phone sends a barcode it read. */
    @PostMapping("/scan/submit")
    public ScanSubmitResponse submit(@Valid @RequestBody ScanSubmitRequest request) {
        return scanSessionService.submit(request.token(), request.code());
    }
}
