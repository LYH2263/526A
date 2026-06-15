package com.example.book.dto;

import lombok.Data;
import java.util.List;

@Data
public class BookExportRequest {
    private String format;
    private String taskName;
    private Long categoryId;
    private Boolean filterByCategory;
    private List<Long> tagIds;
    private String tagSemantic;
}
