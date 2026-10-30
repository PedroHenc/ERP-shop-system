package com.pedrohenc.erp.entity;

public enum SaleStatus {
    COMPLETED,
    /** Cancelled after the fact: its stock went back as entries; the sale itself is kept. */
    CANCELLED
}
