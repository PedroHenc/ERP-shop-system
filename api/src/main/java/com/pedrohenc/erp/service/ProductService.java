package com.pedrohenc.erp.service;

import com.pedrohenc.erp.dto.product.ProductPageRequest;
import com.pedrohenc.erp.dto.product.ProductPageResponse;
import com.pedrohenc.erp.dto.product.ProductRequest;
import com.pedrohenc.erp.dto.product.ProductResponse;
import com.pedrohenc.erp.entity.TbBrand;
import com.pedrohenc.erp.entity.TbProduct;
import com.pedrohenc.erp.exception.FieldErrorException;
import com.pedrohenc.erp.exception.ResourceNotFoundException;
import com.pedrohenc.erp.repository.BrandRepository;
import com.pedrohenc.erp.repository.ProductRepository;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ProductService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("name", "sku", "price", "category", "active");

    private final ProductRepository productRepository;
    private final BrandRepository brandRepository;

    @Transactional(readOnly = true)
    public List<ProductResponse> findAll() {
        return productRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ProductPageResponse findPage(ProductPageRequest request) {
        if (!ALLOWED_SORT_FIELDS.contains(request.sortBy())) {
            throw new IllegalArgumentException("Invalid sort field: " + request.sortBy());
        }

        Page<TbProduct> result = productRepository.findAll(
                createSpecification(request),
                PageRequest.of(request.page(), request.size(), Sort.by(Sort.Direction.fromString(request.direction()), request.sortBy())
                        .and(Sort.by(Sort.Direction.ASC, "id")))
        );

        return new ProductPageResponse(
                result.getContent().stream().map(this::toResponse).toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages(),
                result.isLast()
        );
    }

    @Transactional(readOnly = true)
    public ProductResponse findById(Long id) {
        return toResponse(findEntityById(id));
    }

    @Transactional
    public ProductResponse create(ProductRequest request) {
        validateUniqueIdentifiers(request, null);

        TbProduct tbProduct = new TbProduct();
        populateProduct(tbProduct, request);
        return toResponse(productRepository.save(tbProduct));
    }

    @Transactional
    public ProductResponse update(Long id, ProductRequest request) {
        TbProduct tbProduct = findEntityById(id);
        if (request.version() != null && !request.version().equals(tbProduct.getVersion())) {
            throw new ObjectOptimisticLockingFailureException(TbProduct.class, id);
        }
        validateUniqueIdentifiers(request, id);

        populateProduct(tbProduct, request);
        return toResponse(productRepository.saveAndFlush(tbProduct));
    }

    @Transactional
    public void delete(Long id) {
        productRepository.delete(findEntityById(id));
    }

    private TbProduct findEntityById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
    }

    private TbBrand findBrandById(Long brandId) {
        if (brandId == null) {
            return null;
        }

        return brandRepository.findById(brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Brand", brandId));
    }

    private Specification<TbProduct> createSpecification(ProductPageRequest request) {
        return (root, query, criteriaBuilder) -> {
            var predicates = criteriaBuilder.conjunction();

            if (StringUtils.hasText(request.name())) {
                predicates = criteriaBuilder.and(predicates, containsIgnoreCase(criteriaBuilder, root.get("name"), request.name()));
            }
            if (StringUtils.hasText(request.sku())) {
                predicates = criteriaBuilder.and(predicates, containsIgnoreCase(criteriaBuilder, root.get("sku"), request.sku()));
            }
            if (StringUtils.hasText(request.category())) {
                predicates = criteriaBuilder.and(predicates,
                        criteriaBuilder.equal(criteriaBuilder.lower(root.get("category")), request.category().trim().toLowerCase()));
            }
            if (request.brandId() != null) {
                predicates = criteriaBuilder.and(predicates,
                        criteriaBuilder.equal(root.join("brand", JoinType.LEFT).get("id"), request.brandId()));
            }
            if (request.active() != null) {
                predicates = criteriaBuilder.and(predicates, criteriaBuilder.equal(root.get("active"), request.active()));
            }

            return predicates;
        };
    }

    private jakarta.persistence.criteria.Predicate containsIgnoreCase(
            jakarta.persistence.criteria.CriteriaBuilder criteriaBuilder,
            jakarta.persistence.criteria.Expression<String> field,
            String value
    ) {
        return criteriaBuilder.like(criteriaBuilder.lower(field), "%" + value.trim().toLowerCase() + "%");
    }

    private void populateProduct(TbProduct tbProduct, ProductRequest request) {
        tbProduct.setSku(request.sku().trim());
        tbProduct.setBarcode(request.barcode());
        tbProduct.setName(request.name().trim());
        tbProduct.setDescription(request.description());
        tbProduct.setCategory(request.category().trim());
        tbProduct.setSubcategory(request.subcategory());
        tbProduct.setBrand(findBrandById(request.brandId()));
        tbProduct.setPrice(request.price());
        tbProduct.setUnitOfMeasure(request.unitOfMeasure());
        tbProduct.setStockQuantity(request.stockQuantity());
        tbProduct.setMinimumStock(request.minimumStock());
        tbProduct.setReorderPoint(request.reorderPoint());
        tbProduct.setAllowNegativeStock(request.allowNegativeStock());
        tbProduct.setActive(request.active());
    }

    private void validateUniqueIdentifiers(ProductRequest request, Long id) {
        String sku = request.sku().trim();
        boolean skuAlreadyExists = id == null
                ? productRepository.existsBySku(sku)
                : productRepository.existsBySkuAndIdNot(sku, id);

        if (skuAlreadyExists) {
            throw new FieldErrorException("sku", "A product with this SKU already exists");
        }

        if (request.barcode() == null) {
            return;
        }

        boolean barcodeAlreadyExists = id == null
                ? productRepository.existsByBarcode(request.barcode())
                : productRepository.existsByBarcodeAndIdNot(request.barcode(), id);

        if (barcodeAlreadyExists) {
            throw new FieldErrorException("barcode", "A product with this barcode already exists");
        }
    }

    private ProductResponse toResponse(TbProduct tbProduct) {
        TbBrand brand = tbProduct.getBrand();

        return new ProductResponse(
                tbProduct.getId(), tbProduct.getVersion(), tbProduct.getSku(), tbProduct.getBarcode(), tbProduct.getName(),
                tbProduct.getDescription(), tbProduct.getCategory(), tbProduct.getSubcategory(),
                brand == null ? null : brand.getId(), brand == null ? null : brand.getName(),
                tbProduct.getPrice(), tbProduct.getUnitOfMeasure(), tbProduct.getStockQuantity(), tbProduct.getMinimumStock(),
                tbProduct.getReorderPoint(), tbProduct.getAllowNegativeStock(), tbProduct.getActive(),
                tbProduct.getCreatedDate(), tbProduct.getLastModifiedDate()
        );
    }
}
