package com.example.book.controller;

import com.example.book.common.PageResult;
import com.example.book.common.Result;
import com.example.book.entity.Notification;
import com.example.book.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @GetMapping
    public Result<PageResult<Notification>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageResult<Notification> result = notificationService.findByPage(page, size);
        return Result.success(result);
    }

    @GetMapping("/unread-count")
    public Result<Long> unreadCount() {
        long count = notificationService.countUnread();
        return Result.success(count);
    }

    @PutMapping("/{id}/read")
    public Result<Void> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return Result.success(null);
    }

    @PutMapping("/read-all")
    public Result<Void> markAllAsRead() {
        notificationService.markAllAsRead();
        return Result.success(null);
    }
}
