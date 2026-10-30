package com.pedrohenc.erp.exception;

/**
 * The invite code is unknown, used, revoked, expired, or its store is suspended. One exception for every
 * case, so the response does not reveal which (404).
 */
public class InvalidInviteException extends RuntimeException {

    public static final String MESSAGE = "This invite is invalid or has expired";

    public InvalidInviteException() {
        super(MESSAGE);
    }
}
