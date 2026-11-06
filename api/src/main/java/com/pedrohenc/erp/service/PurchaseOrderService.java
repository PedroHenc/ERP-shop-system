package com.pedrohenc.erp.service;

import com.pedrohenc.erp.dto.purchase.PurchaseOrderPageRequest;
import com.pedrohenc.erp.dto.purchase.PurchaseOrderPageResponse;
import com.pedrohenc.erp.dto.purchase.PurchaseOrderReceiveRequest;
import com.pedrohenc.erp.dto.purchase.PurchaseOrderRequest;
import com.pedrohenc.erp.dto.purchase.PurchaseOrderResponse;
import com.pedrohenc.erp.dto.purchase.PurchaseOrderSummary;
import com.pedrohenc.erp.dto.purchase.ReorderSuggestion;
import com.pedrohenc.erp.entity.PurchaseOrderStatus;
import com.pedrohenc.erp.entity.StockMovementReason;
import com.pedrohenc.erp.entity.StockMovementType;
import com.pedrohenc.erp.entity.TbProduct;
import com.pedrohenc.erp.entity.TbPurchaseOrder;
import com.pedrohenc.erp.entity.TbPurchaseOrderItem;
import com.pedrohenc.erp.entity.TbSupplier;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.exception.FieldErrorException;
import com.pedrohenc.erp.exception.ResourceNotFoundException;
import com.pedrohenc.erp.repository.ProductRepository;
import com.pedrohenc.erp.repository.PurchaseOrderRepository;
import com.pedrohenc.erp.repository.StoreRepository;
import com.pedrohenc.erp.repository.SupplierRepository;
import com.pedrohenc.erp.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Purchase orders: drafted and edited, sent to the supplier, then received. Receiving enters what arrived
 * into stock (entries with the reason PURCHASE) and, unless told not to, moves each product's cost to the
 * weighted average of the stock it had and what arrived. Products are locked in id order, like sales.
 */
@Service
public class PurchaseOrderService {

    private static final Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"));
    /** Suggestions refill to this many times the reorder point. */
    private static final BigDecimal REFILL_FACTOR = BigDecimal.valueOf(2);

    private final PurchaseOrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final SupplierRepository supplierRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final StockMovementService stockMovementService;
    private final Clock clock;
    @PersistenceContext
    private EntityManager entityManager;

    public PurchaseOrderService(PurchaseOrderRepository orderRepository, ProductRepository productRepository,
                                SupplierRepository supplierRepository, StoreRepository storeRepository,
                                UserRepository userRepository, StockMovementService stockMovementService, Clock clock) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.supplierRepository = supplierRepository;
        this.storeRepository = storeRepository;
        this.userRepository = userRepository;
        this.stockMovementService = stockMovementService;
        this.clock = clock;
    }

    @Transactional
    public PurchaseOrderResponse create(long actingUserId, PurchaseOrderRequest request) {
        TbUser author = user(actingUserId);
        storeRepository.findForUpdate(author.getStoreId())
                .orElseThrow(() -> new ResourceNotFoundException("Store", author.getStoreId()));
        TbPurchaseOrder order = TbPurchaseOrder.builder()
                .storeId(author.getStoreId())
                .number(orderRepository.nextNumber())
                .status(PurchaseOrderStatus.DRAFT)
                .createdBy(author)
                .createdAt(clock.instant())
                .build();
        fill(order, request);
        return PurchaseOrderResponse.from(orderRepository.save(order));
    }

    /** Only a draft is edited; its items are replaced by the request's. */
    @Transactional
    public PurchaseOrderResponse update(Long id, PurchaseOrderRequest request) {
        TbPurchaseOrder order = locked(id);
        if (order.getStatus() != PurchaseOrderStatus.DRAFT) {
            throw new FieldErrorException("status", "Only a draft can be edited");
        }
        fill(order, request);
        return PurchaseOrderResponse.from(orderRepository.saveAndFlush(order));
    }

    @Transactional
    public PurchaseOrderResponse send(Long id) {
        TbPurchaseOrder order = locked(id);
        if (order.getStatus() != PurchaseOrderStatus.DRAFT) {
            throw new FieldErrorException("status", "Only a draft can be sent");
        }
        order.setStatus(PurchaseOrderStatus.ORDERED);
        order.setOrderedAt(clock.instant());
        return PurchaseOrderResponse.from(order);
    }

    @Transactional
    public PurchaseOrderResponse cancel(Long id) {
        TbPurchaseOrder order = locked(id);
        if (!order.getStatus().isOpen()) {
            throw new FieldErrorException("status", "A received or cancelled order cannot be cancelled");
        }
        order.setStatus(PurchaseOrderStatus.CANCELLED);
        order.setCancelledAt(clock.instant());
        return PurchaseOrderResponse.from(order);
    }

    /** Enters what arrived into stock and closes the order. A draft can be received directly. */
    @Transactional
    public PurchaseOrderResponse receive(long actingUserId, Long id, PurchaseOrderReceiveRequest request) {
        TbUser author = user(actingUserId);
        TbPurchaseOrder order = locked(id);
        if (!order.getStatus().isOpen()) {
            throw new FieldErrorException("status", "This order was already received or cancelled");
        }
        Map<Long, PurchaseOrderReceiveRequest.Item> received = new HashMap<>();
        for (PurchaseOrderReceiveRequest.Item item : request.items()) {
            if (received.put(item.itemId(), item) != null) {
                throw new FieldErrorException("items", "Each item can be received only once");
            }
        }
        Set<Long> itemIds = new HashSet<>(order.getItems().stream().map(TbPurchaseOrderItem::getId).toList());
        if (!itemIds.equals(received.keySet())) {
            throw new FieldErrorException("items", "Say what arrived for every item of the order");
        }

        boolean updateCosts = request.updateCosts() == null || request.updateCosts();
        String note = "Purchase order #" + order.getNumber();
        BigDecimal receivedTotal = BigDecimal.ZERO;
        // Lock order: product id, like sales and cancellations.
        List<TbPurchaseOrderItem> items = order.getItems().stream()
                .sorted(Comparator.comparing((TbPurchaseOrderItem item) -> item.getProduct() == null ? Long.MAX_VALUE : item.getProduct().getId()))
                .toList();
        for (TbPurchaseOrderItem item : items) {
            PurchaseOrderReceiveRequest.Item arrival = received.get(item.getId());
            BigDecimal quantity = arrival.receivedQuantity();
            BigDecimal unitCost = arrival.unitCost().setScale(2, RoundingMode.HALF_UP);
            if (item.getUnitOfMeasure().isCountable() && quantity.stripTrailingZeros().scale() > 0) {
                throw new FieldErrorException("items", item.getName() + " is counted in whole units");
            }
            item.setReceivedQuantity(quantity);
            item.setReceivedUnitCost(unitCost);
            receivedTotal = receivedTotal.add(quantity.multiply(unitCost));
            if (quantity.signum() == 0 || item.getProduct() == null) {
                continue;
            }
            TbProduct product = productRepository.findForStockUpdate(item.getProduct().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product", item.getProduct().getId()));
            BigDecimal newCost = updateCosts ? averageCost(product.getStockQuantity(), product.getCostPrice(), quantity, unitCost) : null;
            Long productId = product.getId();
            stockMovementService.apply(product, StockMovementType.ENTRY, StockMovementReason.PURCHASE, quantity, note, author,
                    null, "items");
            if (newCost != null) {
                productRepository.updateCostPrice(productId, newCost);
            }
        }
        order.setReceivedTotal(receivedTotal.setScale(2, RoundingMode.HALF_UP));
        order.setStatus(PurchaseOrderStatus.RECEIVED);
        order.setReceivedAt(clock.instant());
        order.setReceivedBy(author);
        orderRepository.flush();
        // Stock entries detached the products: reload so the response shows their new stock and cost.
        entityManager.clear();
        return PurchaseOrderResponse.from(orderRepository.findById(id).orElseThrow());
    }

    /**
     * The cost after receiving: the weighted average of the stock on hand at its cost and what arrived at
     * its cost. Without a known cost, or without stock to average with (none, or negative), it is simply
     * the cost paid now.
     */
    static BigDecimal averageCost(BigDecimal stock, BigDecimal currentCost, BigDecimal quantity, BigDecimal unitCost) {
        if (currentCost == null || stock.signum() <= 0) {
            return unitCost;
        }
        return stock.multiply(currentCost).add(quantity.multiply(unitCost))
                .divide(stock.add(quantity), 2, RoundingMode.HALF_UP);
    }

    @Transactional(readOnly = true)
    public PurchaseOrderResponse findById(Long id) {
        return PurchaseOrderResponse.from(orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase order", id)));
    }

    @Transactional(readOnly = true)
    public PurchaseOrderPageResponse findPage(PurchaseOrderPageRequest request) {
        Page<TbPurchaseOrder> result = orderRepository.findAll(specification(request),
                PageRequest.of(request.page(), request.size(), NEWEST_FIRST));
        List<Long> ids = result.getContent().stream().map(TbPurchaseOrder::getId).toList();
        Map<Long, Long> counts = new HashMap<>();
        if (!ids.isEmpty()) {
            for (Object[] row : orderRepository.countItems(ids)) {
                counts.put((Long) row[0], (Long) row[1]);
            }
        }
        return new PurchaseOrderPageResponse(
                result.getContent().stream().map(order -> new PurchaseOrderSummary(order.getId(), order.getNumber(),
                        order.getStatus(), order.getSupplier().getId(), PurchaseOrderResponse.supplierName(order),
                        counts.getOrDefault(order.getId(), 0L), order.getTotal(), order.getReceivedTotal(),
                        order.getCreatedAt(), order.getReceivedAt())).toList(),
                result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages(), result.isLast());
    }

    /** Products to reorder: at or below their reorder point, less what open orders already bring. */
    @Transactional(readOnly = true)
    public List<ReorderSuggestion> suggestions() {
        Map<Long, BigDecimal> onOrder = new HashMap<>();
        for (Object[] row : orderRepository.quantitiesOnOrder()) {
            onOrder.put((Long) row[0], (BigDecimal) row[1]);
        }
        return productRepository.findBelowReorderPoint().stream()
                .map(product -> {
                    BigDecimal ordered = onOrder.getOrDefault(product.getId(), BigDecimal.ZERO);
                    BigDecimal missing = product.getReorderPoint().multiply(REFILL_FACTOR)
                            .subtract(product.getStockQuantity()).subtract(ordered);
                    if (product.getUnitOfMeasure().isCountable()) {
                        missing = missing.setScale(0, RoundingMode.CEILING);
                    }
                    return new ReorderSuggestion(product.getId(), product.getSku(), product.getName(),
                            product.getUnitOfMeasure(), product.getStockQuantity(), product.getMinimumStock(),
                            product.getReorderPoint(), ordered, missing, product.getCostPrice());
                })
                .filter(suggestion -> suggestion.suggestedQuantity().signum() > 0)
                .toList();
    }

    private void fill(TbPurchaseOrder order, PurchaseOrderRequest request) {
        TbSupplier supplier = supplierRepository.findById(request.supplierId())
                .orElseThrow(() -> new FieldErrorException("supplierId", "Supplier not found"));
        if (!Boolean.TRUE.equals(supplier.getActive()) && !supplier.equals(order.getSupplier())) {
            throw new FieldErrorException("supplierId", "This supplier is inactive");
        }
        order.setSupplier(supplier);
        order.setNotes(StringUtils.hasText(request.notes()) ? request.notes().trim() : null);
        order.getItems().clear();
        Set<Long> seen = new HashSet<>();
        BigDecimal total = BigDecimal.ZERO;
        for (PurchaseOrderRequest.Item line : request.items()) {
            if (!seen.add(line.productId())) {
                throw new FieldErrorException("items", "Each product can appear only once");
            }
            TbProduct product = productRepository.findById(line.productId())
                    .orElseThrow(() -> new FieldErrorException("items", "A product of this order no longer exists"));
            if (product.getUnitOfMeasure().isCountable() && line.quantity().stripTrailingZeros().scale() > 0) {
                throw new FieldErrorException("items", product.getName() + " is counted in whole units");
            }
            BigDecimal unitCost = line.unitCost().setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineTotal = line.quantity().multiply(unitCost).setScale(2, RoundingMode.HALF_UP);
            order.getItems().add(TbPurchaseOrderItem.builder()
                    .storeId(order.getStoreId())
                    .purchaseOrder(order)
                    .product(product)
                    .sku(product.getSku())
                    .name(product.getName())
                    .unitOfMeasure(product.getUnitOfMeasure())
                    .quantity(line.quantity())
                    .unitCost(unitCost)
                    .total(lineTotal)
                    .build());
            total = total.add(lineTotal);
        }
        order.setTotal(total);
    }

    private TbPurchaseOrder locked(Long id) {
        return orderRepository.findForUpdate(id).orElseThrow(() -> new ResourceNotFoundException("Purchase order", id));
    }

    private TbUser user(long id) {
        return userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    private static Specification<TbPurchaseOrder> specification(PurchaseOrderPageRequest request) {
        return (root, query, cb) -> {
            var predicate = cb.conjunction();
            if (request.status() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("status"), request.status()));
            }
            if (request.supplierId() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("supplier").get("id"), request.supplierId()));
            }
            if (request.number() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("number"), request.number()));
            }
            return predicate;
        };
    }
}
