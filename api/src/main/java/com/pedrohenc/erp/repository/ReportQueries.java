package com.pedrohenc.erp.repository;

import com.pedrohenc.erp.entity.StockMovementReason;
import com.pedrohenc.erp.entity.StockMovementType;
import com.pedrohenc.erp.entity.TbStockMovement;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

/**
 * Aggregates for the reports. JPQL only: Hibernate's tenant filter applies to it, so every query stays
 * inside the signed-in user's store (native SQL would not be filtered).
 */
public interface ReportQueries extends Repository<TbStockMovement, Long> {

    /** [type, count]. */
    @Query("select m.type, count(m) from TbStockMovement m where m.createdAt >= :from and m.createdAt < :to group by m.type")
    List<Object[]> countByType(Instant from, Instant to);

    /** [createdAt, signed value]: one row per movement, bucketed into days by the caller (time zones). */
    @Query("select m.createdAt, m.quantity * p.price from TbStockMovement m join m.product p "
            + "where m.createdAt >= :from and m.createdAt < :to")
    List<Object[]> signedValues(Instant from, Instant to);

    /** [productId, name, sku, unit, quantity, value] of exits, the largest value first. */
    @Query("select p.id, p.name, p.sku, p.unitOfMeasure, sum(-m.quantity), sum(-m.quantity * p.price) "
            + "from TbStockMovement m join m.product p "
            + "where m.type = :type and m.createdAt >= :from and m.createdAt < :to "
            + "group by p.id, p.name, p.sku, p.unitOfMeasure order by sum(-m.quantity * p.price) desc, p.name asc")
    List<Object[]> topExits(StockMovementType type, Instant from, Instant to, Pageable pageable);

    /** Like topExits, for exits with the given reasons plus adjustments that removed stock. */
    @Query("select p.id, p.name, p.sku, p.unitOfMeasure, sum(-m.quantity), sum(-m.quantity * p.price) "
            + "from TbStockMovement m join m.product p "
            + "where m.createdAt >= :from and m.createdAt < :to and m.quantity < 0 "
            + "and (m.reason in :reasons or m.type = com.pedrohenc.erp.entity.StockMovementType.ADJUSTMENT) "
            + "group by p.id, p.name, p.sku, p.unitOfMeasure order by sum(-m.quantity * p.price) desc, p.name asc")
    List<Object[]> losses(Collection<StockMovementReason> reasons, Instant from, Instant to, Pageable pageable);

    /** [type, reason, count, |value|]. */
    @Query("select m.type, m.reason, count(m), sum(abs(m.quantity) * p.price) from TbStockMovement m join m.product p "
            + "where m.createdAt >= :from and m.createdAt < :to group by m.type, m.reason order by count(m) desc")
    List<Object[]> byReason(Instant from, Instant to);

    /**
     * [category, active products, value of their positive stock at sale price, the same at cost (products
     * with a cost only), products without a cost].
     */
    @Query("select p.category, count(p), coalesce(sum(case when p.stockQuantity > 0 then p.price * p.stockQuantity else 0 end), 0), "
            + "coalesce(sum(case when p.stockQuantity > 0 and p.costPrice is not null then p.costPrice * p.stockQuantity else 0 end), 0), "
            + "sum(case when p.costPrice is null then 1 else 0 end) "
            + "from TbProduct p where p.active = true group by p.category "
            + "order by coalesce(sum(case when p.stockQuantity > 0 then p.price * p.stockQuantity else 0 end), 0) desc, p.category asc")
    List<Object[]> stockByCategory();

    /** [count, revenue, discounts] of completed sales. */
    @Query("select count(s), coalesce(sum(s.total), 0), coalesce(sum(s.itemsDiscount + s.discount), 0) from TbSale s "
            + "where s.status = com.pedrohenc.erp.entity.SaleStatus.COMPLETED and s.createdAt >= :from and s.createdAt < :to")
    List<Object[]> salesTotals(Instant from, Instant to);

    @Query("select count(s) from TbSale s "
            + "where s.status = com.pedrohenc.erp.entity.SaleStatus.CANCELLED and s.createdAt >= :from and s.createdAt < :to")
    long cancelledSales(Instant from, Instant to);

    /** [createdAt, total] of each completed sale, bucketed into days by the caller (time zones). */
    @Query("select s.createdAt, s.total from TbSale s "
            + "where s.status = com.pedrohenc.erp.entity.SaleStatus.COMPLETED and s.createdAt >= :from and s.createdAt < :to")
    List<Object[]> saleTotals(Instant from, Instant to);

    /**
     * [productId (null once deleted), name, sku, unit, quantity, revenue, profit, revenue of the lines with a
     * cost], the best sellers first. Profit and its revenue cover only lines sold with a cost (null if none).
     */
    @Query("select p.id, i.name, i.sku, i.unitOfMeasure, sum(i.quantity), sum(i.total), "
            + "sum(case when i.unitCost is not null then i.total - i.quantity * i.unitCost end), "
            + "sum(case when i.unitCost is not null then i.total end) "
            + "from TbSaleItem i join i.sale s left join i.product p "
            + "where s.status = com.pedrohenc.erp.entity.SaleStatus.COMPLETED and s.createdAt >= :from and s.createdAt < :to "
            + "group by p.id, i.name, i.sku, i.unitOfMeasure order by sum(i.total) desc, i.name asc")
    List<Object[]> topSellers(Instant from, Instant to, Pageable pageable);

    /** [method, count, revenue] of completed sales. */
    @Query("select s.paymentMethod, count(s), sum(s.total) from TbSale s "
            + "where s.status = com.pedrohenc.erp.entity.SaleStatus.COMPLETED and s.createdAt >= :from and s.createdAt < :to "
            + "group by s.paymentMethod order by sum(s.total) desc")
    List<Object[]> salesByPayment(Instant from, Instant to);

    /**
     * [revenue, cost] of the completed sales' lines that were sold with a cost. Each line's revenue carries
     * its share of the discount on the whole sale (line total × sale total ÷ sum of line totals), so the
     * profit matches what was actually charged.
     */
    @Query("select coalesce(sum(case when (s.subtotal - s.itemsDiscount) > 0 "
            + "then i.total * s.total / (s.subtotal - s.itemsDiscount) else 0 end), 0), "
            + "coalesce(sum(i.quantity * i.unitCost), 0) "
            + "from TbSaleItem i join i.sale s "
            + "where s.status = com.pedrohenc.erp.entity.SaleStatus.COMPLETED and s.createdAt >= :from and s.createdAt < :to "
            + "and i.unitCost is not null")
    List<Object[]> costedSales(Instant from, Instant to);

    /**
     * [category (null once the product is deleted), revenue, profit, revenue of the lines with a cost], by
     * line totals like topSellers; profit covers only lines sold with a cost.
     */
    @Query("select p.category, sum(i.total), "
            + "sum(case when i.unitCost is not null then i.total - i.quantity * i.unitCost end), "
            + "sum(case when i.unitCost is not null then i.total end) "
            + "from TbSaleItem i join i.sale s left join i.product p "
            + "where s.status = com.pedrohenc.erp.entity.SaleStatus.COMPLETED and s.createdAt >= :from and s.createdAt < :to "
            + "group by p.category order by sum(i.total) desc")
    List<Object[]> salesByCategory(Instant from, Instant to);
}
