package com.pedrohenc.erp.service;

import com.pedrohenc.erp.dto.stock.StockMovementPageRequest;
import com.pedrohenc.erp.dto.stock.StockMovementPageResponse;
import com.pedrohenc.erp.dto.stock.StockMovementRequest;
import com.pedrohenc.erp.dto.stock.StockMovementResponse;
import com.pedrohenc.erp.entity.StockMovementReason;
import com.pedrohenc.erp.entity.StockMovementType;
import com.pedrohenc.erp.entity.TbProduct;
import com.pedrohenc.erp.entity.TbStockMovement;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.exception.FieldErrorException;
import com.pedrohenc.erp.exception.ResourceNotFoundException;
import com.pedrohenc.erp.repository.ProductRepository;
import com.pedrohenc.erp.repository.StockMovementRepository;
import com.pedrohenc.erp.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Clock;

/**
 * The only way a product's stock changes after it is created. Each movement locks the product's row,
 * so concurrent movements apply in order and `balanceAfter` always matches the stock they produced.
 */
@Service
public class StockMovementService {

    private static final Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"));

    private final StockMovementRepository movementRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    public StockMovementService(StockMovementRepository movementRepository, ProductRepository productRepository,
                                UserRepository userRepository, Clock clock) {
        this.movementRepository = movementRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.clock = clock;
    }

    @Transactional
    public StockMovementResponse record(long actingUserId, Long productId, StockMovementRequest request) {
        if (request.type() == StockMovementType.INITIAL) {
            throw new FieldErrorException("type", "Initial stock is set when the product is created");
        }
        if (!request.reason().appliesTo(request.type())) {
            throw new FieldErrorException("reason", "This reason does not apply to this type of movement");
        }
        TbProduct product = productRepository.findForStockUpdate(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", productId));
        BigDecimal current = product.getStockQuantity();
        BigDecimal change = switch (request.type()) {
            case ENTRY -> request.quantity();
            case EXIT -> request.quantity().negate();
            case ADJUSTMENT -> request.quantity().subtract(current);
            case INITIAL -> throw new IllegalStateException("unreachable");
        };
        if (request.type() != StockMovementType.ADJUSTMENT && request.quantity().signum() == 0) {
            throw new FieldErrorException("quantity", "Quantity must be greater than zero");
        }
        if (request.type() == StockMovementType.ADJUSTMENT && change.signum() == 0) {
            throw new FieldErrorException("quantity", "The counted quantity is already the current stock");
        }
        BigDecimal balance = current.add(change);
        if (balance.signum() < 0 && !product.getAllowNegativeStock()) {
            throw new FieldErrorException("quantity", "Not enough stock: " + current.stripTrailingZeros().toPlainString() + " available");
        }
        TbUser author = userRepository.findById(actingUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", actingUserId));

        TbStockMovement movement = movementRepository.save(TbStockMovement.builder()
                .storeId(product.getStoreId())
                .product(product)
                .type(request.type())
                .reason(request.reason())
                .quantity(change)
                .balanceAfter(balance)
                .note(StringUtils.hasText(request.note()) ? request.note().trim() : null)
                .createdBy(author)
                .createdAt(clock.instant())
                .build());
        StockMovementResponse response = StockMovementResponse.from(movement);
        productRepository.updateStockQuantity(productId, balance);
        return response;
    }

    /** The movement of a product created with stock. Called by ProductService inside its transaction. */
    @Transactional
    public void recordInitial(TbProduct product, Long actingUserId) {
        if (product.getStockQuantity().signum() == 0) {
            return;
        }
        movementRepository.save(TbStockMovement.builder()
                .storeId(product.getStoreId())
                .product(product)
                .type(StockMovementType.INITIAL)
                .reason(StockMovementReason.INITIAL_STOCK)
                .quantity(product.getStockQuantity())
                .balanceAfter(product.getStockQuantity())
                .createdBy(actingUserId == null ? null : userRepository.findById(actingUserId).orElse(null))
                .createdAt(clock.instant())
                .build());
    }

    @Transactional(readOnly = true)
    public StockMovementPageResponse findPage(StockMovementPageRequest request) {
        Page<TbStockMovement> result = movementRepository.findAll(
                specification(request), PageRequest.of(request.page(), request.size(), NEWEST_FIRST));
        return new StockMovementPageResponse(
                result.getContent().stream().map(StockMovementResponse::from).toList(),
                result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages(), result.isLast());
    }

    private static Specification<TbStockMovement> specification(StockMovementPageRequest request) {
        return (root, query, cb) -> {
            var predicate = cb.conjunction();
            if (request.productId() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("product").get("id"), request.productId()));
            }
            if (request.type() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("type"), request.type()));
            }
            if (request.from() != null) {
                predicate = cb.and(predicate, cb.greaterThanOrEqualTo(root.get("createdAt"), request.from()));
            }
            if (request.to() != null) {
                predicate = cb.and(predicate, cb.lessThan(root.get("createdAt"), request.to()));
            }
            return predicate;
        };
    }
}
