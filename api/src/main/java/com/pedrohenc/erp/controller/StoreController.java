package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.dto.store.StoreResponse;
import com.pedrohenc.erp.dto.store.StoreUpdateRequest;
import com.pedrohenc.erp.security.Roles;
import com.pedrohenc.erp.service.StoreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The signed-in user's own store: everyone sees its name and logo, admins change them. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/store")
public class StoreController {

    private final StoreService storeService;

    @PreAuthorize(Roles.ANY)
    @GetMapping
    public StoreResponse find(@AuthenticationPrincipal Jwt jwt) {
        return storeService.find(storeId(jwt));
    }

    @PreAuthorize(Roles.ADMIN)
    @PutMapping
    public StoreResponse update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody StoreUpdateRequest request) {
        return storeService.update(storeId(jwt), request);
    }

    private static Long storeId(Jwt jwt) {
        return ((Number) jwt.getClaim("store")).longValue();
    }
}
