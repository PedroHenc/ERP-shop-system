package com.pedrohenc.erp.exception;

/** The user's store is inactive: login and refresh are refused with 403. */
public class StoreSuspendedException extends RuntimeException {

    public static final String MESSAGE = "This store is suspended";

    public StoreSuspendedException() {
        super(MESSAGE);
    }
}
