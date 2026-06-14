package com.example.book.entity;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class FavoriteWithBook {
    private Long favoriteId;
    private Long userId;
    private Long bookId;
    private LocalDateTime createdAt;

    private String title;
    private String author;
    private BigDecimal price;
    private String description;
    private Long categoryId;
    private String categoryName;
    private Integer totalStock;
    private Integer availableStock;
    private BigDecimal avgRating;
    private Integer reviewCount;
    private Integer favoriteCount;
    private List<Tag> tags;
}
