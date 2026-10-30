package com.pedrohenc.erp.service;

import com.pedrohenc.erp.dto.store.StoreResponse;
import com.pedrohenc.erp.dto.store.StoreUpdateRequest;
import com.pedrohenc.erp.entity.TbStore;
import com.pedrohenc.erp.exception.FieldErrorException;
import com.pedrohenc.erp.exception.ResourceNotFoundException;
import com.pedrohenc.erp.repository.StoreRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Base64;
import java.util.regex.Pattern;

@Service
public class StoreService {

    /** The app sends a resized logo of a few KB; this only bounds what is stored. */
    public static final int MAX_LOGO_BYTES = 256 * 1024;

    private static final Pattern LOGO_PREFIX = Pattern.compile("^data:image/(png|jpeg|webp);base64,");

    private final StoreRepository storeRepository;

    public StoreService(StoreRepository storeRepository) {
        this.storeRepository = storeRepository;
    }

    @Transactional(readOnly = true)
    public StoreResponse find(Long storeId) {
        return toResponse(load(storeId));
    }

    @Transactional
    public StoreResponse update(Long storeId, StoreUpdateRequest request) {
        TbStore store = load(storeId);
        store.setName(request.name().trim());
        store.setLogo(validLogo(request.logo()));
        return toResponse(store);
    }

    private TbStore load(Long storeId) {
        return storeRepository.findById(storeId).orElseThrow(() -> new ResourceNotFoundException("Store", storeId));
    }

    private static String validLogo(String logo) {
        if (logo == null || logo.isBlank()) {
            return null;
        }
        var prefix = LOGO_PREFIX.matcher(logo);
        if (!prefix.find()) {
            throw new FieldErrorException("logo", "Logo must be a PNG, JPEG or WebP image");
        }
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(logo.substring(prefix.end()));
        } catch (IllegalArgumentException e) {
            throw new FieldErrorException("logo", "Logo must be a PNG, JPEG or WebP image");
        }
        if (bytes.length == 0 || bytes.length > MAX_LOGO_BYTES) {
            throw new FieldErrorException("logo", "Logo must be at most 256 KB");
        }
        return logo;
    }

    private static StoreResponse toResponse(TbStore store) {
        return new StoreResponse(store.getId(), store.getName(), store.getLogo());
    }
}
