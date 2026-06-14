package com.example.book.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BookReview {
    private Long id;
    private Long bookId;
    private Long userId;
    private String username;
    private Integer rating;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
