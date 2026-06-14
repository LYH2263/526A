package com.example.book.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Notification {
    private Long id;
    private String type;
    private String title;
    private String content;
    private Long bookId;
    private String bookTitle;
    private Integer stockSnapshot;
    private Boolean isRead;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
