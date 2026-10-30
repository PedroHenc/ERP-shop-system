package com.pedrohenc.erp.exception;

/** Public store sign-up is turned off ({@code app.signup.enabled=false}): refused with 403. */
public class SignupDisabledException extends RuntimeException {

    public static final String MESSAGE = "Creating new stores is disabled";

    public SignupDisabledException() {
        super(MESSAGE);
    }
}
