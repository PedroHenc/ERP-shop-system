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

/** A sale from the point of sale. Never edited once completed: it can only be cancelled. */
@Entity
@Table(name = "tb_sales",
        uniqueConstraints = @UniqueConstraint(name = "uk_tb_sales_store_number", columnNames = {"store_id", "number"}),
        indexes = @Index(name = "idx_tb_sales_store_created", columnList = "store_id, created_at desc"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TbSale {

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
    private SaleStatus status;

    @Column(nullable = false, precision = 19, scale = 2, updatable = false)
    private BigDecimal subtotal;

    @Column(nullable = false, precision = 19, scale = 2, updatable = false)
    private BigDecimal itemsDiscount;

    @Column(nullable = false, precision = 19, scale = 2, updatable = false)
    private BigDecimal discount;

    @Column(nullable = false, precision = 19, scale = 2, updatable = false)
    private BigDecimal total;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private PaymentMethod paymentMethod;

    @Column(nullable = false, precision = 19, scale = 2, updatable = false)
    private BigDecimal amountPaid;

    @Column(name = "change_due", nullable = false, precision = 19, scale = 2, updatable = false)
    private BigDecimal change;

    @Column(length = 500, updatable = false)
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id", updatable = false)
    private TbUser createdBy;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private Instant cancelledAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cancelled_by_user_id")
    private TbUser cancelledBy;

    @Column(length = 500)
    private String cancelReason;

    @OneToMany(mappedBy = "sale", cascade = CascadeType.PERSIST)
    @OrderBy("id")
    @Builder.Default
    private List<TbSaleItem> items = new ArrayList<>();
}
