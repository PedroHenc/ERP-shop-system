package com.pedrohenc.erp.exception;

/** The QR code is unknown, expired or already used: the phone asks for a new one. */
public class InvalidScanSessionException extends RuntimeException {

    public static final String MESSAGE = "This QR code is no longer valid";

    public InvalidScanSessionException() {
        super(MESSAGE);
    }
}
