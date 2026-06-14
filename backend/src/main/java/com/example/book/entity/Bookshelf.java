package com.example.book.entity;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class Bookshelf {
    private Long id;
    private String name;
    private Integer positionX;
    private Integer positionY;
    private Integer width;
    private Integer sortOrder;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ShelfLayer> layers;
}
