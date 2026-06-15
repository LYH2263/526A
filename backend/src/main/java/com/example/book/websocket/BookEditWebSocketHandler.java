package com.example.book.websocket;

import com.example.book.entity.Book;
import com.example.book.entity.FieldEditState;
import com.example.book.entity.OnlineEditor;
import com.example.book.entity.WebSocketMessage;
import com.example.book.service.CollaborativeEditService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class BookEditWebSocketHandler extends TextWebSocketHandler {

    @Autowired
    private CollaborativeEditService collaborativeEditService;

    @Autowired
    private ObjectMapper objectMapper;

    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, Map<String, WebSocketSession>> bookSessions = new ConcurrentHashMap<>();
    private final Map<String, String> sessionBookMap = new ConcurrentHashMap<>();
    private final Map<String, String> sessionUserMap = new ConcurrentHashMap<>();
    private final Map<String, String> wsSessionToClientSessionMap = new ConcurrentHashMap<>();
    private final Map<String, String> wsSessionToUsernameMap = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.put(session.getId(), session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        try {
            WebSocketMessage msg = objectMapper.readValue(message.getPayload(), WebSocketMessage.class);
            msg.setSessionId(session.getId());

            switch (msg.getType()) {
                case WebSocketMessage.TYPE_JOIN:
                    handleJoin(session, msg);
                    break;
                case WebSocketMessage.TYPE_LEAVE:
                    handleLeave(session, msg);
                    break;
                case WebSocketMessage.TYPE_HEARTBEAT:
                    handleHeartbeat(session, msg);
                    break;
                case WebSocketMessage.TYPE_FIELD_EDIT:
                    handleFieldEdit(session, msg);
                    break;
                case WebSocketMessage.TYPE_FIELD_EDIT_END:
                    handleFieldEditEnd(session, msg);
                    break;
                default:
                    sendError(session, "Unknown message type: " + msg.getType());
            }
        } catch (Exception e) {
            sendError(session, e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String wsSessionId = session.getId();
        String bookKey = sessionBookMap.get(wsSessionId);
        String userIdStr = sessionUserMap.get(wsSessionId);
        String clientSessionId = wsSessionToClientSessionMap.get(wsSessionId);
        String username = wsSessionToUsernameMap.get(wsSessionId);

        if (bookKey != null && userIdStr != null && clientSessionId != null) {
            Long bookId = Long.parseLong(bookKey.split("_")[0]);
            Long userId = Long.parseLong(userIdStr);

            collaborativeEditService.leaveEdit(bookId, userId, clientSessionId);

            broadcastToBook(bookId, WebSocketMessage.of(
                    WebSocketMessage.TYPE_LEAVE,
                    bookId,
                    userId,
                    username != null ? username : "unknown",
                    collaborativeEditService.getOtherOnlineEditorsDistinct(bookId, userId)
            ));
        }

        cleanupSession(session);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        afterConnectionClosed(session, CloseStatus.SERVER_ERROR);
    }

    private void handleJoin(WebSocketSession session, WebSocketMessage msg) {
        Long bookId = msg.getBookId();
        Long userId = msg.getUserId();
        String username = msg.getUsername();
        String clientSessionId = msg.getSessionId();

        if (bookId == null || userId == null) {
            sendError(session, "bookId and userId are required");
            return;
        }

        String sessionId = (clientSessionId != null && !clientSessionId.isEmpty())
                ? clientSessionId
                : session.getId();

        collaborativeEditService.joinEdit(bookId, userId, username, sessionId);

        String bookKey = bookId + "_" + userId;
        sessionBookMap.put(session.getId(), bookKey);
        sessionUserMap.put(session.getId(), userId.toString());
        wsSessionToClientSessionMap.put(session.getId(), sessionId);
        wsSessionToUsernameMap.put(session.getId(), username);

        bookSessions.computeIfAbsent(bookKey, k -> new ConcurrentHashMap<>())
                .put(session.getId(), session);

        WebSocketMessage onlineEditorsMsg = WebSocketMessage.of(
                WebSocketMessage.TYPE_ONLINE_EDITORS,
                bookId,
                userId,
                username,
                collaborativeEditService.getOtherOnlineEditorsDistinct(bookId, userId)
        );
        onlineEditorsMsg.setSessionId(sessionId);
        sendMessage(session, onlineEditorsMsg);

        sendMessage(session, WebSocketMessage.of(
                WebSocketMessage.TYPE_FIELD_STATES,
                bookId,
                userId,
                username,
                collaborativeEditService.getFieldStates(bookId)
        ));

        broadcastToBook(bookId, WebSocketMessage.of(
                WebSocketMessage.TYPE_JOIN,
                bookId,
                userId,
                username,
                collaborativeEditService.getOtherOnlineEditorsDistinct(bookId, userId)
        ));
    }

    private void handleLeave(WebSocketSession session, WebSocketMessage msg) {
        Long bookId = msg.getBookId();
        Long userId = msg.getUserId();
        String clientSessionId = msg.getSessionId();

        String sessionId = (clientSessionId != null && !clientSessionId.isEmpty())
                ? clientSessionId
                : session.getId();

        if (bookId != null && userId != null) {
            collaborativeEditService.leaveEdit(bookId, userId, sessionId);
            broadcastToBook(bookId, WebSocketMessage.of(
                    WebSocketMessage.TYPE_LEAVE,
                    bookId,
                    userId,
                    msg.getUsername(),
                    collaborativeEditService.getOtherOnlineEditorsDistinct(bookId, userId)
            ));
        }

        cleanupSession(session);
    }

    private void handleHeartbeat(WebSocketSession session, WebSocketMessage msg) {
        Long bookId = msg.getBookId();
        Long userId = msg.getUserId();
        String clientSessionId = msg.getSessionId();

        String sessionId = (clientSessionId != null && !clientSessionId.isEmpty())
                ? clientSessionId
                : session.getId();

        if (bookId != null && userId != null) {
            boolean alive = collaborativeEditService.heartbeat(bookId, userId, sessionId);
            if (!alive) {
                sendError(session, "Session expired, please rejoin");
            }
        }
    }

    private void handleFieldEdit(WebSocketSession session, WebSocketMessage msg) {
        Long bookId = msg.getBookId();
        Long userId = msg.getUserId();
        String username = msg.getUsername();

        if (msg.getPayload() instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = (Map<String, Object>) msg.getPayload();
            String fieldName = (String) payload.get("fieldName");

            if (bookId != null && userId != null && fieldName != null) {
                FieldEditState state = collaborativeEditService.startFieldEdit(
                        bookId, fieldName, userId, username, session.getId()
                );

                WebSocketMessage broadcastMsg = WebSocketMessage.of(
                        WebSocketMessage.TYPE_FIELD_EDIT,
                        bookId,
                        userId,
                        username,
                        state
                );
                broadcastToBook(bookId, broadcastMsg);
            }
        }
    }

    private void handleFieldEditEnd(WebSocketSession session, WebSocketMessage msg) {
        Long bookId = msg.getBookId();
        Long userId = msg.getUserId();

        if (msg.getPayload() instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = (Map<String, Object>) msg.getPayload();
            String fieldName = (String) payload.get("fieldName");

            if (bookId != null && userId != null && fieldName != null) {
                collaborativeEditService.endFieldEdit(bookId, fieldName, userId, session.getId());

                WebSocketMessage broadcastMsg = WebSocketMessage.of(
                        WebSocketMessage.TYPE_FIELD_EDIT_END,
                        bookId,
                        userId,
                        msg.getUsername(),
                        payload
                );
                broadcastToBook(bookId, broadcastMsg);
            }
        }
    }

    public void broadcastBookUpdated(Long bookId, Book updatedBook) {
        WebSocketMessage msg = WebSocketMessage.of(
                WebSocketMessage.TYPE_BOOK_UPDATED,
                bookId,
                null,
                "system",
                updatedBook
        );
        broadcastToBook(bookId, msg);
    }

    private void broadcastToBook(Long bookId, WebSocketMessage message) {
        String msgStr;
        try {
            msgStr = objectMapper.writeValueAsString(message);
        } catch (Exception e) {
            return;
        }

        for (Map.Entry<String, Map<String, WebSocketSession>> entry : bookSessions.entrySet()) {
            if (entry.getKey().startsWith(bookId + "_")) {
                for (WebSocketSession session : entry.getValue().values()) {
                    if (session.isOpen()) {
                        try {
                            session.sendMessage(new TextMessage(msgStr));
                        } catch (Exception ignored) {
                        }
                    }
                }
            }
        }
    }

    private void sendMessage(WebSocketSession session, WebSocketMessage message) {
        try {
            String msgStr = objectMapper.writeValueAsString(message);
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(msgStr));
            }
        } catch (Exception e) {
        }
    }

    private void sendError(WebSocketSession session, String errorMsg) {
        WebSocketMessage msg = new WebSocketMessage();
        msg.setType(WebSocketMessage.TYPE_ERROR);
        msg.setMessage(errorMsg);
        msg.setTimestamp(java.time.LocalDateTime.now());
        sendMessage(session, msg);
    }

    private void cleanupSession(WebSocketSession session) {
        String sessionId = session.getId();
        sessions.remove(sessionId);

        String bookKey = sessionBookMap.remove(sessionId);
        if (bookKey != null) {
            Map<String, WebSocketSession> bookSessionMap = bookSessions.get(bookKey);
            if (bookSessionMap != null) {
                bookSessionMap.remove(sessionId);
                if (bookSessionMap.isEmpty()) {
                    bookSessions.remove(bookKey);
                }
            }
        }

        sessionUserMap.remove(sessionId);
        wsSessionToClientSessionMap.remove(sessionId);
        wsSessionToUsernameMap.remove(sessionId);
    }

    private String getUsernameFromSession(WebSocketSession session) {
        Map<String, Object> attributes = session.getAttributes();
        return (String) attributes.getOrDefault("username", "unknown");
    }
}
