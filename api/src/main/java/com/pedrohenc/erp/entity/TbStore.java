package com.pedrohenc.erp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/** A store: the tenant that owns products, brands, suppliers, users and their sessions. */
@Entity
@Table(name = "tb_stores")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TbStore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    /** {@code data:image/...;base64,...}, at most {@link com.pedrohenc.erp.service.StoreService#MAX_LOGO_BYTES} decoded. */
    @Column(columnDefinition = "text")
    private String logo;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
}
