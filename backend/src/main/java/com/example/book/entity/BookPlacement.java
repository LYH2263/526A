package com.example.book.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BookPlacement {
    private Long id;
    private Long bookId;
    private Long bookshelfId;
    private Long layerId;
    private Integer positionIndex;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Book book;
}
