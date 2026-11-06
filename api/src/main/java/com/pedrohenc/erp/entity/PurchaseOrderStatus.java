package com.pedrohenc.erp.entity;

/** DRAFT (editable) → ORDERED (sent to the supplier) → RECEIVED; DRAFT or ORDERED can be CANCELLED. */
public enum PurchaseOrderStatus {
    DRAFT,
    ORDERED,
    RECEIVED,
    CANCELLED;

    /** Still waiting for the goods: can be received or cancelled. */
    public boolean isOpen() {
        return this == DRAFT || this == ORDERED;
    }
}
