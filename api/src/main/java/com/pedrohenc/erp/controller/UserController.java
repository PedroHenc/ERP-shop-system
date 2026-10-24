package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.dto.StatusRequest;
import com.pedrohenc.erp.dto.user.SetPasswordRequest;
import com.pedrohenc.erp.dto.user.UserCreateRequest;
import com.pedrohenc.erp.dto.user.UserPageRequest;
import com.pedrohenc.erp.dto.user.UserPageResponse;
import com.pedrohenc.erp.dto.user.UserResponse;
import com.pedrohenc.erp.dto.user.UserUpdateRequest;
import com.pedrohenc.erp.security.Roles;
import com.pedrohenc.erp.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@PreAuthorize(Roles.ADMIN)
public class UserController {

    private final UserService userService;

    @GetMapping("/page")
    public UserPageResponse findPage(@Valid @ModelAttribute UserPageRequest request) {
        return userService.findPage(request);
    }

    @GetMapping("/{id}")
    public UserResponse findById(@PathVariable Long id) {
        return userService.findById(id);
    }

    @PostMapping
    public ResponseEntity<UserResponse> create(@Valid @RequestBody UserCreateRequest request) {
        UserResponse user = userService.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(user.id())
                .toUri();

        return ResponseEntity.created(location).body(user);
    }

    @PutMapping("/{id}")
    public UserResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                               @Valid @RequestBody UserUpdateRequest request) {
        return userService.update(actingUserId(jwt), id, request);
    }

    @PatchMapping("/{id}/status")
    public UserResponse setStatus(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                  @Valid @RequestBody StatusRequest request) {
        return userService.setStatus(actingUserId(jwt), id, request.active());
    }

    @PostMapping("/{id}/password")
    public ResponseEntity<Void> setPassword(@PathVariable Long id, @Valid @RequestBody SetPasswordRequest request) {
        userService.setPassword(id, request.password());
        return ResponseEntity.noContent().build();
    }

    private static long actingUserId(Jwt jwt) {
        return Long.parseLong(jwt.getSubject());
    }
}
