package com.pedrohenc.erp.entity;

import java.util.Set;

/** Why stock moved. Each reason belongs to one movement type. */
public enum StockMovementReason {
    INITIAL_STOCK(StockMovementType.INITIAL),
    PURCHASE(StockMovementType.ENTRY),
    CUSTOMER_RETURN(StockMovementType.ENTRY),
    SALE(StockMovementType.EXIT),
    LOSS(StockMovementType.EXIT),
    DAMAGE(StockMovementType.EXIT),
    INTERNAL_USE(StockMovementType.EXIT),
    INVENTORY_COUNT(StockMovementType.ADJUSTMENT),
    CORRECTION(StockMovementType.ADJUSTMENT),
    /** Any manual type. */
    OTHER(StockMovementType.ENTRY, StockMovementType.EXIT, StockMovementType.ADJUSTMENT);

    private final Set<StockMovementType> types;

    StockMovementReason(StockMovementType... types) {
        this.types = Set.of(types);
    }

    public boolean appliesTo(StockMovementType type) {
        return types.contains(type);
    }
}
