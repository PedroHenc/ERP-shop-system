package com.pedrohenc.erp.service;

import com.pedrohenc.erp.dto.supplier.SupplierPageRequest;
import com.pedrohenc.erp.dto.supplier.SupplierPageResponse;
import com.pedrohenc.erp.dto.supplier.SupplierRequest;
import com.pedrohenc.erp.dto.supplier.SupplierResponse;
import com.pedrohenc.erp.entity.TbSupplier;
import com.pedrohenc.erp.exception.FieldErrorException;
import com.pedrohenc.erp.exception.ResourceNotFoundException;
import com.pedrohenc.erp.repository.SupplierRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("legalName", "tradeName", "active");
    private static final Pattern VALID_TAX_ID = Pattern.compile("[A-Z0-9]{1,14}");
    private static final String INVALID_TAX_ID_MESSAGE = "Tax ID must have up to 14 letters or digits";
    private static final String DUPLICATE_TAX_ID_MESSAGE = "A supplier with this tax ID already exists";
    private static final char LIKE_ESCAPE = '\\';

    private final SupplierRepository supplierRepository;

    public static String normalizeTaxId(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return raw.replaceAll("[.\\-/\\s]", "").toUpperCase(Locale.ROOT);
    }

    @Transactional(readOnly = true)
    public SupplierPageResponse findPage(SupplierPageRequest request) {
        if (!ALLOWED_SORT_FIELDS.contains(request.sortBy())) {
            throw new IllegalArgumentException("Invalid sort field: " + request.sortBy());
        }

        Page<TbSupplier> result = supplierRepository.findAll(
                createSpecification(request),
                PageRequest.of(request.page(), request.size(), Sort.by(Sort.Direction.fromString(request.direction()), request.sortBy()))
        );

        return new SupplierPageResponse(
                result.getContent().stream().map(this::toResponse).toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages(),
                result.isLast()
        );
    }

    @Transactional(readOnly = true)
    public SupplierResponse findById(Long id) {
        return toResponse(findEntityById(id));
    }

    @Transactional
    public SupplierResponse create(SupplierRequest request) {
        String taxId = validTaxId(request.taxId());
        if (taxId != null && supplierRepository.existsByTaxId(taxId)) {
            throw new FieldErrorException("taxId", DUPLICATE_TAX_ID_MESSAGE);
        }

        TbSupplier supplier = new TbSupplier();
        apply(supplier, request, taxId);
        return toResponse(supplierRepository.save(supplier));
    }

    @Transactional
    public SupplierResponse update(Long id, SupplierRequest request) {
        TbSupplier supplier = findEntityById(id);
        if (request.version() != null && !request.version().equals(supplier.getVersion())) {
            throw new ObjectOptimisticLockingFailureException(TbSupplier.class, id);
        }

        String taxId = validTaxId(request.taxId());
        if (taxId != null && supplierRepository.existsByTaxIdAndIdNot(taxId, id)) {
            throw new FieldErrorException("taxId", DUPLICATE_TAX_ID_MESSAGE);
        }

        apply(supplier, request, taxId);
        return toResponse(supplierRepository.saveAndFlush(supplier));
    }

    @Transactional
    public SupplierResponse setStatus(Long id, boolean active) {
        TbSupplier supplier = findEntityById(id);
        supplier.setActive(active);
        return toResponse(supplierRepository.saveAndFlush(supplier));
    }

    private static String validTaxId(String raw) {
        String taxId = normalizeTaxId(raw);
        if (taxId != null && !VALID_TAX_ID.matcher(taxId).matches()) {
            throw new FieldErrorException("taxId", INVALID_TAX_ID_MESSAGE);
        }
        return taxId;
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private static void apply(TbSupplier supplier, SupplierRequest request, String taxId) {
        supplier.setLegalName(request.legalName().trim());
        supplier.setTradeName(blankToNull(request.tradeName()));
        supplier.setTaxId(taxId);
        supplier.setEmail(blankToNull(request.email()));
        supplier.setPhone(blankToNull(request.phone()));
        supplier.setActive(request.active());
    }

    private TbSupplier findEntityById(Long id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier", id));
    }

    private static String containsPattern(String value) {
        String escaped = value
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }

    private Specification<TbSupplier> createSpecification(SupplierPageRequest request) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (StringUtils.hasText(request.name())) {
                String pattern = containsPattern(request.name().trim().toLowerCase(Locale.ROOT));
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("legalName")), pattern, LIKE_ESCAPE),
                        cb.like(cb.lower(root.get("tradeName")), pattern, LIKE_ESCAPE)
                ));
            }
            String taxId = normalizeTaxId(request.taxId());
            if (StringUtils.hasText(taxId)) {
                predicates.add(cb.like(root.get("taxId"), containsPattern(taxId), LIKE_ESCAPE));
            }
            if (request.active() != null) {
                predicates.add(cb.equal(root.get("active"), request.active()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private SupplierResponse toResponse(TbSupplier supplier) {
        return new SupplierResponse(
                supplier.getId(), supplier.getVersion(), supplier.getLegalName(), supplier.getTradeName(),
                supplier.getTaxId(), supplier.getEmail(), supplier.getPhone(), supplier.getActive(),
                supplier.getCreatedDate(), supplier.getLastModifiedDate()
        );
    }
}
