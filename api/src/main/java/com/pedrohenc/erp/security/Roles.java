package com.pedrohenc.erp.security;

import java.util.Set;

public final class Roles {

    public static final String ANY = "hasAnyRole('ADMIN','MANAGER','CASHIER','STOCK')";
    public static final String CATALOG_WRITE = "hasAnyRole('ADMIN','MANAGER','STOCK')";
    /** Recording stock movements and reading their history. */
    public static final String STOCK_MOVE = CATALOG_WRITE;
    public static final String SUPPLIER_READ = CATALOG_WRITE;
    // Mirrors SUPPLIER_READ as granted authorities, for programmatic checks
    public static final Set<String> SUPPLIER_READ_AUTHORITIES = Set.of("ROLE_ADMIN", "ROLE_MANAGER", "ROLE_STOCK");
    public static final String SUPPLIER_WRITE = "hasAnyRole('ADMIN','MANAGER')";
    public static final String ADMIN = "hasRole('ADMIN')";

    private Roles() {
    }
}