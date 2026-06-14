package com.example.book.controller;

import com.example.book.common.Result;
import com.example.book.entity.Book;
import com.example.book.entity.EditConflictResponse;
import com.example.book.entity.FieldEditState;
import com.example.book.entity.OnlineEditor;
import com.example.book.service.BookService;
import com.example.book.service.CollaborativeEditService;
import com.example.book.websocket.BookEditWebSocketHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/books/edit")
public class BookEditController {

    @Autowired
    private CollaborativeEditService collaborativeEditService;

    @Autowired
    private BookService bookService;

    @Autowired
    private BookEditWebSocketHandler webSocketHandler;

    @PostMapping("/{bookId}/join")
    public Result<Map<String, Object>> joinEdit(
            @PathVariable Long bookId,
            @RequestParam Long userId,
            @RequestParam String username) {

        String sessionId = UUID.randomUUID().toString();
        OnlineEditor editor = collaborativeEditService.joinEdit(bookId, userId, username, sessionId);

        Map<String, Object> result = new HashMap<>();
        result.put("sessionId", sessionId);
        result.put("editor", editor);
        result.put("onlineEditors", collaborativeEditService.getOtherOnlineEditors(bookId, userId, sessionId));
        result.put("fieldStates", collaborativeEditService.getFieldStates(bookId));
        result.put("book", bookService.findById(bookId));

        return Result.success(result);
    }

    @PostMapping("/{bookId}/leave")
    public Result<Void> leaveEdit(
            @PathVariable Long bookId,
            @RequestParam Long userId,
            @RequestParam String sessionId) {

        collaborativeEditService.leaveEdit(bookId, userId, sessionId);
        return Result.success(null);
    }

    @PostMapping("/{bookId}/heartbeat")
    public Result<Boolean> heartbeat(
            @PathVariable Long bookId,
            @RequestParam Long userId,
            @RequestParam String sessionId) {

        boolean alive = collaborativeEditService.heartbeat(bookId, userId, sessionId);
        return Result.success(alive);
    }

    @PostMapping("/{bookId}/field-edit")
    public Result<FieldEditState> startFieldEdit(
            @PathVariable Long bookId,
            @RequestParam Long userId,
            @RequestParam String username,
            @RequestParam String sessionId,
            @RequestParam String fieldName) {

        FieldEditState state = collaborativeEditService.startFieldEdit(bookId, fieldName, userId, username, sessionId);
        return Result.success(state);
    }

    @DeleteMapping("/{bookId}/field-edit")
    public Result<Void> endFieldEdit(
            @PathVariable Long bookId,
            @RequestParam Long userId,
            @RequestParam String sessionId,
            @RequestParam String fieldName) {

        collaborativeEditService.endFieldEdit(bookId, fieldName, userId, sessionId);
        return Result.success(null);
    }

    @GetMapping("/{bookId}/online-editors")
    public Result<List<OnlineEditor>> getOnlineEditors(
            @PathVariable Long bookId,
            @RequestParam(required = false) Long excludeUserId,
            @RequestParam(required = false) String excludeSessionId) {

        List<OnlineEditor> editors;
        if (excludeUserId != null && excludeSessionId != null) {
            editors = collaborativeEditService.getOtherOnlineEditors(bookId, excludeUserId, excludeSessionId);
        } else {
            editors = collaborativeEditService.getOnlineEditors(bookId);
        }
        return Result.success(editors);
    }

    @PostMapping("/submit")
    public Result<EditConflictResponse> submitWithVersion(
            @RequestBody Book book,
            @RequestParam Long userId,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) boolean force) {

        if (force) {
            Book updated = collaborativeEditService.forceUpdate(book);
            bookService.updateBookTags(book);
            bookService.evaluateStockWarning(book.getId());

            EditConflictResponse response = new EditConflictResponse();
            response.setHasConflict(false);
            response.setMessage("强制更新成功");
            response.setNewVersion(updated.getVersion());

            webSocketHandler.broadcastBookUpdated(book.getId(), updated);

            return Result.success(response);
        }

        EditConflictResponse response = collaborativeEditService.checkAndUpdateWithConflict(book, userId, username);

        if (!response.isHasConflict()) {
            bookService.updateBookTags(book);
            bookService.evaluateStockWarning(book.getId());

            Book latest = bookService.findById(book.getId());
            webSocketHandler.broadcastBookUpdated(book.getId(), latest);
        }

        return Result.success(response);
    }
}
