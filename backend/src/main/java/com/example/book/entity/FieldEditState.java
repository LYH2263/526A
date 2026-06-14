package com.example.book.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class FieldEditState {
    private Long bookId;
    private String fieldName;
    private Long editorUserId;
    private String editorUsername;
    private LocalDateTime editStartTime;
    private String currentValue;
}
