package com.pedrohenc.erp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.TenantId;

import java.math.BigDecimal;
import java.time.Instant;

/** One change to a product's stock. Never updated: corrections are new movements. */
@Entity
@Table(name = "tb_stock_movements", indexes = {
        @Index(name = "idx_tb_stock_movements_store_created", columnList = "store_id, created_at desc"),
        @Index(name = "idx_tb_stock_movements_product_created", columnList = "product_id, created_at desc")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TbStockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @TenantId
    @Column(name = "store_id", nullable = false, updatable = false)
    private Long storeId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false, updatable = false)
    private TbProduct product;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private StockMovementType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30, updatable = false)
    private StockMovementReason reason;

    /** Signed change: positive adds to stock, negative removes. */
    @Column(nullable = false, precision = 19, scale = 3, updatable = false)
    private BigDecimal quantity;

    @Column(nullable = false, precision = 19, scale = 3, updatable = false)
    private BigDecimal balanceAfter;

    @Column(length = 500, updatable = false)
    private String note;

    /** Null for the movements the V4 migration created, and when the user was deleted. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id", updatable = false)
    private TbUser createdBy;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    /** The sale this movement belongs to (its exit, or the entry of its cancellation); null otherwise. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id", updatable = false)
    private TbSale sale;
}
