package com.example.book.entity;

import lombok.Data;

@Data
public class MergePreview {
    private DuplicateGroup.BookDuplicateItem primaryBook;
    private int mergedCount;
    private int totalFavorites;
    private int totalBorrowRecords;
    private int totalReviews;
    private int totalBookTags;
    private int totalPlacements;
    private int totalNotifications;
    private int deletedFavorites;
    private int deletedReviews;
}
