package com.pedrohenc.erp.entity;

/** Why a refresh token was revoked. Only {@link #ROTATED} tokens get the reuse grace period. */
public enum RevokedReason {
    ROTATED, LOGOUT, REVOKED
}
