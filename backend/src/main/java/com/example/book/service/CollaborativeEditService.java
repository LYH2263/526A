package com.example.book.service;

import com.example.book.entity.Book;
import com.example.book.entity.EditConflictResponse;
import com.example.book.entity.FieldEditState;
import com.example.book.entity.OnlineEditor;
import com.example.book.mapper.BookMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class CollaborativeEditService {

    private static final long HEARTBEAT_TIMEOUT_SECONDS = 30;

    private final Map<Long, Map<String, OnlineEditor>> bookEditors = new ConcurrentHashMap<>();
    private final Map<Long, Map<String, FieldEditState>> bookFieldStates = new ConcurrentHashMap<>();

    @Autowired
    private BookMapper bookMapper;

    public OnlineEditor joinEdit(Long bookId, Long userId, String username, String sessionId) {
        bookEditors.computeIfAbsent(bookId, k -> new ConcurrentHashMap<>());

        String key = buildEditorKey(userId, sessionId);
        OnlineEditor editor = new OnlineEditor();
        editor.setBookId(bookId);
        editor.setUserId(userId);
        editor.setUsername(username);
        editor.setSessionId(sessionId);
        editor.setJoinTime(LocalDateTime.now());
        editor.setLastHeartbeat(LocalDateTime.now());

        bookEditors.get(bookId).put(key, editor);
        return editor;
    }

    public void leaveEdit(Long bookId, Long userId, String sessionId) {
        Map<String, OnlineEditor> editors = bookEditors.get(bookId);
        if (editors != null) {
            String key = buildEditorKey(userId, sessionId);
            editors.remove(key);
            if (editors.isEmpty()) {
                bookEditors.remove(bookId);
                bookFieldStates.remove(bookId);
            } else {
                releaseAllFieldsForEditor(bookId, userId, sessionId);
            }
        }
    }

    public boolean heartbeat(Long bookId, Long userId, String sessionId) {
        Map<String, OnlineEditor> editors = bookEditors.get(bookId);
        if (editors != null) {
            String key = buildEditorKey(userId, sessionId);
            OnlineEditor editor = editors.get(key);
            if (editor != null) {
                editor.setLastHeartbeat(LocalDateTime.now());
                return true;
            }
        }
        return false;
    }

    public List<OnlineEditor> getOnlineEditors(Long bookId) {
        Map<String, OnlineEditor> editors = bookEditors.get(bookId);
        if (editors == null || editors.isEmpty()) {
            return Collections.emptyList();
        }
        return new ArrayList<>(editors.values());
    }

    public List<OnlineEditor> getOtherOnlineEditors(Long bookId, Long currentUserId, String sessionId) {
        List<OnlineEditor> all = getOnlineEditors(bookId);
        String currentKey = buildEditorKey(currentUserId, sessionId);
        return all.stream()
                .filter(e -> !buildEditorKey(e.getUserId(), e.getSessionId()).equals(currentKey))
                .collect(Collectors.toList());
    }

    public FieldEditState startFieldEdit(Long bookId, String fieldName, Long userId, String username, String sessionId) {
        bookFieldStates.computeIfAbsent(bookId, k -> new ConcurrentHashMap<>());
        Map<String, FieldEditState> fieldStates = bookFieldStates.get(bookId);

        FieldEditState existing = fieldStates.get(fieldName);
        if (existing != null && !isSameEditor(existing, userId, sessionId)) {
            return existing;
        }

        FieldEditState state = new FieldEditState();
        state.setBookId(bookId);
        state.setFieldName(fieldName);
        state.setEditorUserId(userId);
        state.setEditorUsername(username);
        state.setEditStartTime(LocalDateTime.now());
        fieldStates.put(fieldName, state);
        return state;
    }

    public void endFieldEdit(Long bookId, String fieldName, Long userId, String sessionId) {
        Map<String, FieldEditState> fieldStates = bookFieldStates.get(bookId);
        if (fieldStates != null) {
            FieldEditState state = fieldStates.get(fieldName);
            if (state != null && isSameEditor(state, userId, sessionId)) {
                fieldStates.remove(fieldName);
            }
        }
    }

    public List<FieldEditState> getFieldStates(Long bookId) {
        Map<String, FieldEditState> fieldStates = bookFieldStates.get(bookId);
        if (fieldStates == null || fieldStates.isEmpty()) {
            return Collections.emptyList();
        }
        return new ArrayList<>(fieldStates.values());
    }

    public EditConflictResponse checkAndUpdateWithConflict(Book submittedBook, Long userId, String username) {
        EditConflictResponse response = new EditConflictResponse();

        Book existingBook = bookMapper.findById(submittedBook.getId());
        if (existingBook == null) {
            response.setHasConflict(true);
            response.setMessage("图书不存在");
            return response;
        }

        if (submittedBook.getVersion() == null) {
            submittedBook.setVersion(0);
        }

        if (!submittedBook.getVersion().equals(existingBook.getVersion())) {
            response.setHasConflict(true);
            response.setMessage("检测到版本冲突，该图书已被其他用户修改");
            response.setCurrentVersion(submittedBook.getVersion());
            response.setNewVersion(existingBook.getVersion());
            response.setOriginalBook(copyBookForVersion(submittedBook, submittedBook.getVersion()));
            response.setLatestBook(existingBook);
            response.setFieldDiffs(calculateFieldDiffs(submittedBook, existingBook));
            return response;
        }

        int updatedRows = bookMapper.updateWithVersion(submittedBook);
        if (updatedRows == 0) {
            Book latestBook = bookMapper.findById(submittedBook.getId());
            response.setHasConflict(true);
            response.setMessage("提交失败，该图书已被其他用户修改");
            response.setCurrentVersion(submittedBook.getVersion());
            response.setNewVersion(latestBook != null ? latestBook.getVersion() : submittedBook.getVersion() + 1);
            response.setOriginalBook(copyBookForVersion(submittedBook, submittedBook.getVersion()));
            response.setLatestBook(latestBook);
            response.setFieldDiffs(calculateFieldDiffs(submittedBook, latestBook));
            return response;
        }

        response.setHasConflict(false);
        releaseAllFieldsForEditor(submittedBook.getId(), userId, null);
        return response;
    }

    public Book forceUpdate(Book book) {
        Book latest = bookMapper.findById(book.getId());
        if (latest != null) {
            book.setVersion(latest.getVersion());
        }
        bookMapper.updateWithVersion(book);
        return bookMapper.findById(book.getId());
    }

    private List<EditConflictResponse.FieldDiff> calculateFieldDiffs(Book submitted, Book latest) {
        List<EditConflictResponse.FieldDiff> diffs = new ArrayList<>();
        Map<String, String> fieldLabels = getFieldLabels();

        addFieldDiff(diffs, "title", fieldLabels.get("title"), submitted.getTitle(), latest.getTitle());
        addFieldDiff(diffs, "author", fieldLabels.get("author"), submitted.getAuthor(), latest.getAuthor());
        addFieldDiff(diffs, "price", fieldLabels.get("price"),
                submitted.getPrice() != null ? submitted.getPrice().toString() : null,
                latest.getPrice() != null ? latest.getPrice().toString() : null);
        addFieldDiff(diffs, "publishDate", fieldLabels.get("publishDate"),
                submitted.getPublishDate() != null ? submitted.getPublishDate().toString() : null,
                latest.getPublishDate() != null ? latest.getPublishDate().toString() : null);
        addFieldDiff(diffs, "description", fieldLabels.get("description"), submitted.getDescription(), latest.getDescription());
        addFieldDiff(diffs, "categoryId", fieldLabels.get("categoryId"),
                submitted.getCategoryId() != null ? submitted.getCategoryId().toString() : null,
                latest.getCategoryId() != null ? latest.getCategoryId().toString() : null);
        addFieldDiff(diffs, "totalStock", fieldLabels.get("totalStock"),
                submitted.getTotalStock() != null ? submitted.getTotalStock().toString() : null,
                latest.getTotalStock() != null ? latest.getTotalStock().toString() : null);
        addFieldDiff(diffs, "warnThreshold", fieldLabels.get("warnThreshold"),
                submitted.getWarnThreshold() != null ? submitted.getWarnThreshold().toString() : null,
                latest.getWarnThreshold() != null ? latest.getWarnThreshold().toString() : null);

        return diffs.stream()
                .filter(d -> !Objects.equals(d.getOriginalValue(), d.getLatestValue()))
                .collect(Collectors.toList());
    }

    private void addFieldDiff(List<EditConflictResponse.FieldDiff> diffs, String fieldName, String label,
                              String submittedValue, String latestValue) {
        EditConflictResponse.FieldDiff diff = new EditConflictResponse.FieldDiff();
        diff.setFieldName(fieldName);
        diff.setFieldLabel(label);
        diff.setSubmittedValue(submittedValue);
        diff.setLatestValue(latestValue);
        diffs.add(diff);
    }

    private Map<String, String> getFieldLabels() {
        Map<String, String> labels = new HashMap<>();
        labels.put("title", "书名");
        labels.put("author", "作者");
        labels.put("price", "价格");
        labels.put("publishDate", "出版日期");
        labels.put("description", "简介");
        labels.put("categoryId", "分类");
        labels.put("totalStock", "总库存");
        labels.put("warnThreshold", "预警阈值");
        return labels;
    }

    private Book copyBookForVersion(Book book, Integer version) {
        Book copy = new Book();
        copy.setId(book.getId());
        copy.setTitle(book.getTitle());
        copy.setAuthor(book.getAuthor());
        copy.setPrice(book.getPrice());
        copy.setPublishDate(book.getPublishDate());
        copy.setDescription(book.getDescription());
        copy.setCategoryId(book.getCategoryId());
        copy.setTotalStock(book.getTotalStock());
        copy.setWarnThreshold(book.getWarnThreshold());
        copy.setVersion(version);
        return copy;
    }

    private boolean isSameEditor(FieldEditState state, Long userId, String sessionId) {
        if (!state.getEditorUserId().equals(userId)) {
            return false;
        }
        return sessionId == null || state.getEditStartTime() != null;
    }

    private String buildEditorKey(Long userId, String sessionId) {
        return userId + "_" + (sessionId != null ? sessionId : "default");
    }

    private void releaseAllFieldsForEditor(Long bookId, Long userId, String sessionId) {
        Map<String, FieldEditState> fieldStates = bookFieldStates.get(bookId);
        if (fieldStates != null) {
            Iterator<Map.Entry<String, FieldEditState>> iterator = fieldStates.entrySet().iterator();
            while (iterator.hasNext()) {
                Map.Entry<String, FieldEditState> entry = iterator.next();
                FieldEditState state = entry.getValue();
                if (state.getEditorUserId().equals(userId)) {
                    if (sessionId == null) {
                        iterator.remove();
                    }
                }
            }
        }
    }

    @Scheduled(fixedRate = 10000)
    public void cleanupTimeoutSessions() {
        LocalDateTime cutoff = LocalDateTime.now().minusSeconds(HEARTBEAT_TIMEOUT_SECONDS);

        for (Map.Entry<Long, Map<String, OnlineEditor>> bookEntry : bookEditors.entrySet()) {
            Long bookId = bookEntry.getKey();
            Map<String, OnlineEditor> editors = bookEntry.getValue();

            Iterator<Map.Entry<String, OnlineEditor>> iterator = editors.entrySet().iterator();
            while (iterator.hasNext()) {
                Map.Entry<String, OnlineEditor> entry = iterator.next();
                OnlineEditor editor = entry.getValue();
                if (editor.getLastHeartbeat().isBefore(cutoff)) {
                    iterator.remove();
                    releaseAllFieldsForEditor(bookId, editor.getUserId(), editor.getSessionId());
                }
            }

            if (editors.isEmpty()) {
                bookEditors.remove(bookId);
                bookFieldStates.remove(bookId);
            }
        }
    }
}
