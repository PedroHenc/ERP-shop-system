package com.pedrohenc.erp.exception;

public class FieldErrorException extends RuntimeException {

    private final String field;

    public FieldErrorException(String field, String message) {
        super(message);
        this.field = field;
    }

    public String getField() {
        return field;
    }
}
