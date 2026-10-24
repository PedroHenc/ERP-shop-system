package com.pedrohenc.erp.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LikePatternsTest {

    private static final String BS = String.valueOf((char) 92);

    @Test
    void containsIgnoreCaseEscapesWildcardsAndLowercases() {
        assertThat(LikePatterns.containsIgnoreCase("50%_OFF")).isEqualTo("%50" + BS + "%" + BS + "_off%");
    }

    @Test
    void containsEscapesBackslashAndKeepsCase() {
        assertThat(LikePatterns.contains("A" + BS + "B")).isEqualTo("%A" + BS + BS + "B%");
    }
}
