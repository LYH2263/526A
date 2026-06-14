package com.example.book.entity;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class DuplicateGroup {
    private Long groupId;
    private List<BookDuplicateItem> books;
    private Double maxSimilarity;

    @Data
    public static class BookDuplicateItem {
        private Long id;
        private String title;
        private String author;
        private BigDecimal price;
        private LocalDate publishDate;
        private String description;
        private Long categoryId;
        private String categoryName;
        private Integer totalStock;
        private Integer availableStock;
        private Double similarityToRef;
    }
}
