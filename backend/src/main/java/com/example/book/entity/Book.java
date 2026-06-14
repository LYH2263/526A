package com.example.book.entity;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class Book {
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
    private Integer warnThreshold;
    private Integer version;
    private java.math.BigDecimal avgRating;
    private Integer reviewCount;
    private List<Tag> tags;
    private List<Long> tagIds;
    private Integer favoriteCount;
    private Boolean favorited;
}

