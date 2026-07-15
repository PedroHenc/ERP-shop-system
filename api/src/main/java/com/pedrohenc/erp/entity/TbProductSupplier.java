package com.pedrohenc.erp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "tb_product_suppliers", uniqueConstraints = @UniqueConstraint(columnNames = {"product_id", "supplier_id"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TbProductSupplier extends Audit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private TbProduct tbProduct;

    @ManyToOne(optional = false)
    @JoinColumn(name = "supplier_id", nullable = false)
    private TbSupplier tbSupplier;

    @Column(length = 64)
    private String supplierProductCode;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = false;
}
