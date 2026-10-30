package com.pedrohenc.erp.service;

import com.pedrohenc.erp.dto.stock.StockMovementPageRequest;
import com.pedrohenc.erp.dto.stock.StockMovementPageResponse;
import com.pedrohenc.erp.dto.stock.StockMovementRequest;
import com.pedrohenc.erp.dto.stock.StockMovementResponse;
import com.pedrohenc.erp.entity.StockMovementReason;
import com.pedrohenc.erp.entity.StockMovementType;
import com.pedrohenc.erp.entity.TbProduct;
import com.pedrohenc.erp.entity.TbSale;
import com.pedrohenc.erp.entity.TbStockMovement;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.exception.FieldErrorException;
import com.pedrohenc.erp.exception.ResourceNotFoundException;
import com.pedrohenc.erp.repository.ProductRepository;
import com.pedrohenc.erp.repository.StockMovementRepository;
import com.pedrohenc.erp.repository.UserRepository;
import jakarta.persistence.EntityManager;
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
    private final EntityManager entityManager;

    public StockMovementService(StockMovementRepository movementRepository, ProductRepository productRepository,
                                UserRepository userRepository, Clock clock, EntityManager entityManager) {
        this.movementRepository = movementRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.clock = clock;
        this.entityManager = entityManager;
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
        TbUser author = userRepository.findById(actingUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", actingUserId));
        TbStockMovement movement = apply(product, request.type(), request.reason(), change,
                StringUtils.hasText(request.note()) ? request.note().trim() : null, author, null, "quantity");
        return StockMovementResponse.from(movement);
    }

    /**
     * Applies a change to a product locked with {@link ProductRepository#findForStockUpdate}: refuses a
     * negative balance unless the product allows it (as a field error on `field`), records the movement
     * and writes the balance. Used by manual movements and by sales.
     */
    @Transactional
    public TbStockMovement apply(TbProduct product, StockMovementType type, StockMovementReason reason, BigDecimal change,
                                 String note, TbUser author, TbSale sale, String field) {
        BigDecimal current = product.getStockQuantity();
        BigDecimal balance = current.add(change);
        if (balance.signum() < 0 && change.signum() < 0 && !product.getAllowNegativeStock()) {
            String available = current.stripTrailingZeros().toPlainString();
            throw new FieldErrorException(field, sale == null
                    ? "Not enough stock: " + available + " available"
                    : "Not enough stock of " + product.getName() + ": " + available + " available");
        }
        TbStockMovement movement = movementRepository.save(TbStockMovement.builder()
                .storeId(product.getStoreId())
                .product(product)
                .type(type)
                .reason(reason)
                .quantity(change)
                .balanceAfter(balance)
                .note(note)
                .createdBy(author)
                .createdAt(clock.instant())
                .sale(sale)
                .build());
        productRepository.updateStockQuantity(product.getId(), balance);
        // The bulk update bypasses the managed product: drop it so a later read in this transaction sees the new balance.
        entityManager.detach(product);
        return movement;
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
