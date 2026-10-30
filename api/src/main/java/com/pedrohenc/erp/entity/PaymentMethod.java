package com.pedrohenc.erp.entity;

public enum PaymentMethod {
    /** The only method with change: the amount paid may exceed the total. */
    CASH,
    PIX,
    DEBIT_CARD,
    CREDIT_CARD
}
