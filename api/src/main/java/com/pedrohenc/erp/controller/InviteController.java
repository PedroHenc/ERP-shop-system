package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.dto.invite.InviteCreateRequest;
import com.pedrohenc.erp.dto.invite.InviteCreatedResponse;
import com.pedrohenc.erp.dto.invite.InviteResponse;
import com.pedrohenc.erp.security.Roles;
import com.pedrohenc.erp.service.InviteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/invites")
@RequiredArgsConstructor
@PreAuthorize(Roles.ADMIN)
public class InviteController {

    private final InviteService inviteService;

    @GetMapping
    public List<InviteResponse> findPending() {
        return inviteService.findPending();
    }

    @PostMapping
    public ResponseEntity<InviteCreatedResponse> create(@AuthenticationPrincipal Jwt jwt,
                                                        @Valid @RequestBody InviteCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(inviteService.create(Long.parseLong(jwt.getSubject()), request.role()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> revoke(@PathVariable Long id) {
        inviteService.revoke(id);
        return ResponseEntity.noContent().build();
    }
}
