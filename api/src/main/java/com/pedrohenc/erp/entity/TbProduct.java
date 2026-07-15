package com.pedrohenc.erp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "tb_products")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TbProduct extends Audit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private Long version;

    @Column(nullable = false, unique = true, length = 64)
    private String sku;

    @Column(unique = true, length = 14)
    private String barcode;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 1_000)
    private String description;

    @Column(nullable = false, length = 100)
    private String category;

    @Column(length = 100)
    private String subcategory;

    @ManyToOne
    @JoinColumn(name = "brand_id")
    private TbBrand brand;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private UnitOfMeasure unitOfMeasure = UnitOfMeasure.UNIT;

    @Column(nullable = false, precision = 19, scale = 3)
    @Builder.Default
    private BigDecimal stockQuantity = BigDecimal.ZERO;

    @Column(nullable = false, precision = 19, scale = 3)
    @Builder.Default
    private BigDecimal minimumStock = BigDecimal.ZERO;

    @Column(nullable = false, precision = 19, scale = 3)
    @Builder.Default
    private BigDecimal reorderPoint = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private Boolean allowNegativeStock = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;
}
