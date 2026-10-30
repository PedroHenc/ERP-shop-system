package com.pedrohenc.erp.entity;

public enum UnitOfMeasure {
    UNIT,
    KILOGRAM,
    GRAM,
    LITER,
    MILLILITER,
    METER,
    CENTIMETER,
    BOX,
    PIECE;

    /** Sold in whole numbers only (units, boxes, pieces); the others can be fractional (1.5 kg). */
    public boolean isCountable() {
        return this == UNIT || this == BOX || this == PIECE;
    }
}
