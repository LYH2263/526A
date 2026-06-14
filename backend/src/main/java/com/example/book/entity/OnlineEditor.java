package com.example.book.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class OnlineEditor {
    private Long userId;
    private String username;
    private Long bookId;
    private String sessionId;
    private LocalDateTime joinTime;
    private LocalDateTime lastHeartbeat;
}
