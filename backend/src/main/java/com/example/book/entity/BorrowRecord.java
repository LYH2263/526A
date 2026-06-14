package com.example.book.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BorrowRecord {
    private Long id;
    private Long bookId;
    private String bookTitle;
    private String borrower;
    private LocalDateTime borrowTime;
    private LocalDateTime dueTime;
    private LocalDateTime returnTime;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean overdue;
}
