package com.pedrohenc.erp.entity;

/** What a stock movement does to the balance. */
public enum StockMovementType {
    /** The stock a product starts with (on creation, or the balance when history began). */
    INITIAL,
    /** Adds the quantity. */
    ENTRY,
    /** Removes the quantity. */
    EXIT,
    /** Sets the balance to a counted quantity; the movement stores the difference. */
    ADJUSTMENT
}
