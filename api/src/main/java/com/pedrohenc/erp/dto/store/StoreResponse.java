package com.pedrohenc.erp.dto.store;

/** The signed-in user's store, for the app's header. {@code logo} is a data URL or null. */
public record StoreResponse(Long id, String name, String logo) {
}
