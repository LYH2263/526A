package com.example.book.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ExportTask {
    private Long id;
    private String taskName;
    private String exportType;
    private String fileFormat;
    private String status;
    private Long totalRows;
    private Long processedRows;
    private Integer progress;
    private String filePath;
    private String fileName;
    private Long fileSize;
    private String filterParams;
    private Long userId;
    private String username;
    private String errorMessage;
    private Integer retryCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime completedAt;
}
