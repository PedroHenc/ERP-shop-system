package com.pedrohenc.erp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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

/** One line of a sale, with the product's SKU, name, unit and price as they were when sold. */
@Entity
@Table(name = "tb_sale_items")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TbSaleItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @TenantId
    @Column(name = "store_id", nullable = false, updatable = false)
    private Long storeId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sale_id", nullable = false, updatable = false)
    private TbSale sale;

    /** Null once the product is deleted; the copied fields below keep the line readable. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private TbProduct product;

    @Column(nullable = false, length = 64, updatable = false)
    private String sku;

    @Column(nullable = false, length = 150, updatable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private UnitOfMeasure unitOfMeasure;

    @Column(nullable = false, precision = 19, scale = 3, updatable = false)
    private BigDecimal quantity;

    @Column(nullable = false, precision = 19, scale = 2, updatable = false)
    private BigDecimal unitPrice;

    @Column(nullable = false, precision = 19, scale = 2, updatable = false)
    private BigDecimal discount;

    /** quantity × unit price − discount. */
    @Column(nullable = false, precision = 19, scale = 2, updatable = false)
    private BigDecimal total;
}
