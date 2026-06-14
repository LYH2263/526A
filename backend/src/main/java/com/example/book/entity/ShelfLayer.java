package com.example.book.entity;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ShelfLayer {
    private Long id;
    private Long bookshelfId;
    private Integer layerIndex;
    private Integer capacity;
    private Integer height;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<BookPlacement> placements;
    private Integer currentCount;
}
