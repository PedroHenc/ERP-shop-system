package com.pedrohenc.erp.service;

import com.pedrohenc.erp.dto.sale.SaleCancelRequest;
import com.pedrohenc.erp.dto.sale.SalePageRequest;
import com.pedrohenc.erp.dto.sale.SalePageResponse;
import com.pedrohenc.erp.dto.sale.SaleRequest;
import com.pedrohenc.erp.dto.sale.SaleResponse;
import com.pedrohenc.erp.dto.sale.SaleSummaryResponse;
import com.pedrohenc.erp.entity.PaymentMethod;
import com.pedrohenc.erp.entity.SaleStatus;
import com.pedrohenc.erp.entity.StockMovementReason;
import com.pedrohenc.erp.entity.StockMovementType;
import com.pedrohenc.erp.entity.TbProduct;
import com.pedrohenc.erp.entity.TbSale;
import com.pedrohenc.erp.entity.TbSaleItem;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.exception.FieldErrorException;
import com.pedrohenc.erp.exception.ResourceNotFoundException;
import com.pedrohenc.erp.repository.ProductRepository;
import com.pedrohenc.erp.repository.SaleRepository;
import com.pedrohenc.erp.repository.StoreRepository;
import com.pedrohenc.erp.repository.UserRepository;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Sales of the point of sale. Closing a sale charges each product's current price, takes its stock out
 * through stock movements and numbers the sale per store. Locks are always taken in the same order
 * (the store, then products by id), so concurrent sales, cancellations and movements cannot deadlock.
 */
@Service
public class SaleService {

    private static final Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"));

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final StockMovementService stockMovementService;
    private final Clock clock;

    public SaleService(SaleRepository saleRepository, ProductRepository productRepository, StoreRepository storeRepository,
                       UserRepository userRepository, StockMovementService stockMovementService, Clock clock) {
        this.saleRepository = saleRepository;
        this.productRepository = productRepository;
        this.storeRepository = storeRepository;
        this.userRepository = userRepository;
        this.stockMovementService = stockMovementService;
        this.clock = clock;
    }

    @Transactional
    public SaleResponse create(long actingUserId, SaleRequest request) {
        TbUser author = userRepository.findById(actingUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", actingUserId));

        // The same product twice (scanned twice) becomes one line; sorted by id for the lock order.
        Map<Long, BigDecimal[]> lines = new TreeMap<>();
        for (SaleRequest.Item item : request.items()) {
            BigDecimal[] line = lines.computeIfAbsent(item.productId(), id -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            line[0] = line[0].add(item.quantity());
            line[1] = line[1].add(orZero(item.discount()));
        }

        storeRepository.findForUpdate(author.getStoreId())
                .orElseThrow(() -> new ResourceNotFoundException("Store", author.getStoreId()));
        TbSale sale = TbSale.builder()
                .storeId(author.getStoreId())
                .number(saleRepository.nextNumber())
                .status(SaleStatus.COMPLETED)
                .paymentMethod(request.paymentMethod())
                .note(StringUtils.hasText(request.note()) ? request.note().trim() : null)
                .createdBy(author)
                .createdAt(clock.instant())
                .build();

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal itemsDiscount = BigDecimal.ZERO;
        Map<TbSaleItem, TbProduct> products = new HashMap<>();
        for (Map.Entry<Long, BigDecimal[]> entry : lines.entrySet()) {
            TbProduct product = productRepository.findForStockUpdate(entry.getKey())
                    .orElseThrow(() -> new FieldErrorException("items", "A product of this sale no longer exists"));
            BigDecimal quantity = entry.getValue()[0];
            BigDecimal discount = entry.getValue()[1].setScale(2, RoundingMode.HALF_UP);
            if (!product.getActive()) {
                throw new FieldErrorException("items", product.getName() + " is inactive and cannot be sold");
            }
            if (product.getUnitOfMeasure().isCountable() && quantity.stripTrailingZeros().scale() > 0) {
                throw new FieldErrorException("items", product.getName() + " is sold in whole units");
            }
            BigDecimal gross = quantity.multiply(product.getPrice()).setScale(2, RoundingMode.HALF_UP);
            if (discount.compareTo(gross) > 0) {
                throw new FieldErrorException("items", "The discount on " + product.getName() + " is larger than its price");
            }
            TbSaleItem item = TbSaleItem.builder()
                    .storeId(sale.getStoreId())
                    .sale(sale)
                    .product(product)
                    .sku(product.getSku())
                    .name(product.getName())
                    .unitOfMeasure(product.getUnitOfMeasure())
                    .quantity(quantity)
                    .unitPrice(product.getPrice())
                    .unitCost(product.getCostPrice())
                    .discount(discount)
                    .total(gross.subtract(discount))
                    .build();
            sale.getItems().add(item);
            products.put(item, product);
            subtotal = subtotal.add(gross);
            itemsDiscount = itemsDiscount.add(discount);
        }

        BigDecimal saleDiscount = orZero(request.discount()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = subtotal.subtract(itemsDiscount).subtract(saleDiscount);
        if (total.signum() < 0) {
            throw new FieldErrorException("discount", "The discount is larger than the sale");
        }
        BigDecimal amountPaid;
        if (request.paymentMethod() == PaymentMethod.CASH) {
            if (request.amountPaid() == null || request.amountPaid().compareTo(total) < 0) {
                throw new FieldErrorException("amountPaid", "The amount received is less than the total");
            }
            amountPaid = request.amountPaid().setScale(2, RoundingMode.HALF_UP);
        } else {
            amountPaid = total;
        }
        sale.setSubtotal(subtotal);
        sale.setItemsDiscount(itemsDiscount);
        sale.setDiscount(saleDiscount);
        sale.setTotal(total);
        sale.setAmountPaid(amountPaid);
        sale.setChange(amountPaid.subtract(total));
        saleRepository.save(sale);

        String note = "Sale #" + sale.getNumber();
        for (TbSaleItem item : sale.getItems()) {
            stockMovementService.apply(products.get(item), StockMovementType.EXIT, StockMovementReason.SALE,
                    item.getQuantity().negate(), note, author, sale, "items");
        }
        return SaleResponse.from(sale);
    }

    /** Returns the stock of every line as an entry and marks the sale cancelled; it stays in the history. */
    @Transactional
    public SaleResponse cancel(long actingUserId, Long id, SaleCancelRequest request) {
        TbUser author = userRepository.findById(actingUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", actingUserId));
        TbSale sale = saleRepository.findForUpdate(id).orElseThrow(() -> new ResourceNotFoundException("Sale", id));
        if (sale.getStatus() == SaleStatus.CANCELLED) {
            throw new FieldErrorException("reason", "This sale is already cancelled");
        }
        String note = "Sale #" + sale.getNumber() + " cancelled";
        // Deleted products have nothing to take the stock back; by id for the lock order.
        sale.getItems().stream()
                .filter(item -> item.getProduct() != null)
                .sorted((a, b) -> a.getProduct().getId().compareTo(b.getProduct().getId()))
                .forEach(item -> productRepository.findForStockUpdate(item.getProduct().getId()).ifPresent(product ->
                        stockMovementService.apply(product, StockMovementType.ENTRY, StockMovementReason.CUSTOMER_RETURN,
                                item.getQuantity(), note, author, sale, "reason")));
        sale.setStatus(SaleStatus.CANCELLED);
        sale.setCancelledAt(clock.instant());
        sale.setCancelledBy(author);
        sale.setCancelReason(request.reason().trim());
        return SaleResponse.from(sale);
    }

    @Transactional(readOnly = true)
    public SaleResponse findById(Long id) {
        return SaleResponse.from(saleRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Sale", id)));
    }

    @Transactional(readOnly = true)
    public SalePageResponse findPage(SalePageRequest request) {
        Page<TbSale> result = saleRepository.findAll(specification(request), PageRequest.of(request.page(), request.size(), NEWEST_FIRST));
        List<Long> ids = result.getContent().stream().map(TbSale::getId).toList();
        Map<Long, Long> counts = new HashMap<>();
        if (!ids.isEmpty()) {
            for (Object[] row : saleRepository.countItems(ids)) {
                counts.put((Long) row[0], (Long) row[1]);
            }
        }
        return new SalePageResponse(
                result.getContent().stream().map(sale -> new SaleSummaryResponse(sale.getId(), sale.getNumber(), sale.getStatus(),
                        sale.getTotal(), sale.getPaymentMethod(), counts.getOrDefault(sale.getId(), 0L),
                        sale.getCreatedBy() == null ? null : sale.getCreatedBy().getName(), sale.getCreatedAt())).toList(),
                result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages(), result.isLast());
    }

    private static Specification<TbSale> specification(SalePageRequest request) {
        return (root, query, cb) -> {
            var predicate = cb.conjunction();
            if (request.status() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("status"), request.status()));
            }
            if (request.paymentMethod() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("paymentMethod"), request.paymentMethod()));
            }
            if (request.number() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("number"), request.number()));
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

    private static BigDecimal orZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
