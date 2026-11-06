package com.pedrohenc.erp.entity;

import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.TenantId;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** An order to a supplier: edited as a draft, sent, then received into stock (or cancelled). */
@Entity
@Table(name = "tb_purchase_orders",
        uniqueConstraints = @UniqueConstraint(name = "uk_tb_purchase_orders_store_number", columnNames = {"store_id", "number"}),
        indexes = @Index(name = "idx_tb_purchase_orders_store_created", columnList = "store_id, created_at desc"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TbPurchaseOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @TenantId
    @Column(name = "store_id", nullable = false, updatable = false)
    private Long storeId;

    @Column(nullable = false, updatable = false)
    private Long number;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PurchaseOrderStatus status;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "supplier_id", nullable = false)
    private TbSupplier supplier;

    @Column(length = 1000)
    private String notes;

    /** Quantity × unit cost of the items as ordered. */
    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal total;

    /** Received quantity × received cost; null until received. */
    @Column(precision = 19, scale = 2)
    private BigDecimal receivedTotal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id", updatable = false)
    private TbUser createdBy;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private Instant orderedAt;

    private Instant receivedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "received_by_user_id")
    private TbUser receivedBy;

    private Instant cancelledAt;

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    @Builder.Default
    private List<TbPurchaseOrderItem> items = new ArrayList<>();
}
