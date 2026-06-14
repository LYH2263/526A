package com.example.book.entity;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
public class WebSocketMessage {
    private String type;
    private Long bookId;
    private Long userId;
    private String username;
    private String sessionId;
    private LocalDateTime timestamp;
    private String message;
    private Object payload;

    public static final String TYPE_JOIN = "join";
    public static final String TYPE_LEAVE = "leave";
    public static final String TYPE_HEARTBEAT = "heartbeat";
    public static final String TYPE_FIELD_EDIT = "field_edit";
    public static final String TYPE_FIELD_EDIT_END = "field_edit_end";
    public static final String TYPE_BOOK_UPDATED = "book_updated";
    public static final String TYPE_ONLINE_EDITORS = "online_editors";
    public static final String TYPE_FIELD_STATES = "field_states";
    public static final String TYPE_ERROR = "error";

    public static WebSocketMessage of(String type, Long bookId, Long userId, String username, Object payload) {
        WebSocketMessage msg = new WebSocketMessage();
        msg.setType(type);
        msg.setBookId(bookId);
        msg.setUserId(userId);
        msg.setUsername(username);
        msg.setTimestamp(LocalDateTime.now());
        msg.setPayload(payload);
        return msg;
    }
}
