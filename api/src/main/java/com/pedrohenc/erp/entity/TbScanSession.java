package com.pedrohenc.erp.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.TenantId;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** A short-lived link between a screen waiting for a barcode and the phone that reads it. */
@Entity
@Table(name = "tb_scan_sessions", indexes = @Index(name = "idx_tb_scan_sessions_store", columnList = "store_id"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TbScanSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @TenantId
    @Column(name = "store_id", nullable = false, updatable = false)
    private Long storeId;

    /** SHA-256 of the token in the QR code, lowercase hex. The token itself is never stored. */
    @Column(nullable = false, unique = true, length = 64, updatable = false)
    private String tokenHash;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false, updatable = false)
    private TbUser createdBy;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    /** Moved to now when the screen closes a batch session early. */
    @Column(nullable = false)
    private Instant expiresAt;

    /** A batch session takes many codes until it expires or is closed; otherwise one code ends it. */
    @Column(nullable = false, updatable = false)
    @Builder.Default
    private boolean batch = false;

    /** A batch session's codes, in the order they were read. */
    @ElementCollection
    @CollectionTable(name = "tb_scan_session_codes", joinColumns = @JoinColumn(name = "session_id"))
    @OrderColumn(name = "position")
    @Column(name = "code", length = 64, nullable = false)
    @Builder.Default
    private List<String> codes = new ArrayList<>();

    /** A single session's barcode; null while waiting (and always for a batch). */
    @Column(length = 64)
    private String code;

    private Instant scannedAt;
}
