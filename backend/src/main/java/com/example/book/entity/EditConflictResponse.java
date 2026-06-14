package com.example.book.entity;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class EditConflictResponse {
    private boolean hasConflict;
    private String message;
    private Integer currentVersion;
    private Integer newVersion;
    private Book originalBook;
    private Book latestBook;
    private List<FieldDiff> fieldDiffs;
    private String lastModifier;
    private java.time.LocalDateTime lastModifiedTime;

    @Data
    public static class FieldDiff {
        private String fieldName;
        private String fieldLabel;
        private String originalValue;
        private String latestValue;
        private String submittedValue;
    }
}
