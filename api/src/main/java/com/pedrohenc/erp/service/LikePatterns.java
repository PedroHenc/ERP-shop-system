package com.pedrohenc.erp.service;

import java.util.Locale;

/**
 * Builds LIKE patterns that treat user input literally. Use with {@link #ESCAPE} as the escape character.
 */
final class LikePatterns {

    static final char ESCAPE = (char) 92;

    private LikePatterns() {
    }

    /** Contains-pattern for the value as given (case preserved). */
    static String contains(String value) {
        String escaped = value
                .replace(String.valueOf(ESCAPE), "" + ESCAPE + ESCAPE)
                .replace("%", ESCAPE + "%")
                .replace("_", ESCAPE + "_");
        return "%" + escaped + "%";
    }

    /** Contains-pattern lowercased with {@link Locale#ROOT}, for comparison against {@code lower(column)}. */
    static String containsIgnoreCase(String value) {
        return contains(value.toLowerCase(Locale.ROOT));
    }
}
