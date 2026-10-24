package com.pedrohenc.erp.service;

import com.pedrohenc.erp.dto.brand.BrandDetailResponse;
import com.pedrohenc.erp.dto.brand.BrandPageRequest;
import com.pedrohenc.erp.dto.brand.BrandPageResponse;
import com.pedrohenc.erp.dto.brand.BrandRequest;
import com.pedrohenc.erp.dto.brand.BrandResponse;
import com.pedrohenc.erp.entity.TbBrand;
import com.pedrohenc.erp.exception.FieldErrorException;
import com.pedrohenc.erp.exception.ResourceNotFoundException;
import com.pedrohenc.erp.repository.BrandRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class BrandService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("name", "active");
    private static final String DUPLICATE_NAME_MESSAGE = "A brand with this name already exists";

    private final BrandRepository brandRepository;

    @Transactional(readOnly = true)
    public List<BrandResponse> findActive() {
        return brandRepository.findByActiveTrueOrderByNameAsc().stream()
                .map(brand -> new BrandResponse(brand.getId(), brand.getName()))
                .toList();
    }

    @Transactional(readOnly = true)
    public BrandPageResponse findPage(BrandPageRequest request) {
        if (!ALLOWED_SORT_FIELDS.contains(request.sortBy())) {
            throw new IllegalArgumentException("Invalid sort field: " + request.sortBy());
        }

        Page<TbBrand> result = brandRepository.findAll(
                createSpecification(request),
                PageRequest.of(request.page(), request.size(), Sort.by(Sort.Direction.fromString(request.direction()), request.sortBy())
                        .and(Sort.by(Sort.Direction.ASC, "id")))
        );

        return new BrandPageResponse(
                result.getContent().stream().map(this::toDetailResponse).toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages(),
                result.isLast()
        );
    }

    @Transactional(readOnly = true)
    public BrandDetailResponse findById(Long id) {
        return toDetailResponse(findEntityById(id));
    }

    @Transactional
    public BrandDetailResponse create(BrandRequest request) {
        String name = request.name().trim();
        if (brandRepository.existsByNameIgnoreCase(name)) {
            throw new FieldErrorException("name", DUPLICATE_NAME_MESSAGE);
        }

        TbBrand brand = new TbBrand();
        brand.setName(name);
        brand.setActive(request.active());
        return toDetailResponse(brandRepository.save(brand));
    }

    @Transactional
    public BrandDetailResponse update(Long id, BrandRequest request) {
        TbBrand brand = findEntityById(id);
        if (request.version() != null && !request.version().equals(brand.getVersion())) {
            throw new ObjectOptimisticLockingFailureException(TbBrand.class, id);
        }

        String name = request.name().trim();
        if (brandRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new FieldErrorException("name", DUPLICATE_NAME_MESSAGE);
        }

        brand.setName(name);
        brand.setActive(request.active());
        return toDetailResponse(brandRepository.saveAndFlush(brand));
    }

    @Transactional
    public BrandDetailResponse setStatus(Long id, boolean active) {
        TbBrand brand = findEntityById(id);
        brand.setActive(active);
        return toDetailResponse(brandRepository.saveAndFlush(brand));
    }

    private TbBrand findEntityById(Long id) {
        return brandRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Brand", id));
    }

    private Specification<TbBrand> createSpecification(BrandPageRequest request) {
        return (root, query, criteriaBuilder) -> {
            var predicates = criteriaBuilder.conjunction();

            if (StringUtils.hasText(request.name())) {
                predicates = criteriaBuilder.and(predicates,
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("name")),
                                LikePatterns.containsIgnoreCase(request.name().trim()), LikePatterns.ESCAPE));
            }
            if (request.active() != null) {
                predicates = criteriaBuilder.and(predicates, criteriaBuilder.equal(root.get("active"), request.active()));
            }

            return predicates;
        };
    }

    private BrandDetailResponse toDetailResponse(TbBrand brand) {
        return new BrandDetailResponse(
                brand.getId(), brand.getVersion(), brand.getName(), brand.getActive(),
                brand.getCreatedDate(), brand.getLastModifiedDate()
        );
    }
}
