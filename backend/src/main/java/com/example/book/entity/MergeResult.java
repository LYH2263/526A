package com.example.book.entity;

import lombok.Data;
import java.util.List;

@Data
public class MergeResult {
    private Long primaryBookId;
    private int mergedCount;
    private int migratedFavorites;
    private int migratedBorrowRecords;
    private int migratedReviews;
    private int migratedBookTags;
    private int migratedPlacements;

    @Data
    public static class MergeRequest {
        private Long primaryBookId;
        private List<Long> duplicateBookIds;
    }
}
