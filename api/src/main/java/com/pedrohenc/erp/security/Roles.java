package com.pedrohenc.erp.security;

public final class Roles {

    public static final String ANY = "hasAnyRole('ADMIN','MANAGER','CASHIER','STOCK')";
    public static final String CATALOG_WRITE = "hasAnyRole('ADMIN','MANAGER','STOCK')";
    public static final String SUPPLIER_READ = CATALOG_WRITE;
    public static final String SUPPLIER_WRITE = "hasAnyRole('ADMIN','MANAGER')";
    public static final String ADMIN = "hasRole('ADMIN')";

    private Roles() {
    }
}