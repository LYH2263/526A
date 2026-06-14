package com.example.book.service;

import com.example.book.common.PageResult;
import com.example.book.entity.Notification;
import com.example.book.mapper.NotificationMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    private static final String TYPE_LOW_STOCK = "LOW_STOCK";

    @Autowired
    private NotificationMapper notificationMapper;

    public PageResult<Notification> findByPage(int page, int size) {
        int offset = (page - 1) * size;
        List<Notification> list = notificationMapper.findByPage(offset, size);
        long total = notificationMapper.count();
        return new PageResult<>(list, total, page, size);
    }

    public long countUnread() {
        return notificationMapper.countUnread();
    }

    @Transactional
    public void markAsRead(Long id) {
        notificationMapper.markAsRead(id);
    }

    @Transactional
    public void markAllAsRead() {
        notificationMapper.markAllAsRead();
    }

    @Transactional
    public void createLowStockNotification(Long bookId, String bookTitle, int currentStock, int threshold) {
        Notification existing = notificationMapper.findUnreadByBookIdAndType(bookId, TYPE_LOW_STOCK);
        if (existing != null) {
            if (existing.getStockSnapshot() == null || existing.getStockSnapshot() != currentStock) {
                notificationMapper.updateStockSnapshot(existing.getId(), currentStock);
            }
            return;
        }

        Notification notification = new Notification();
        notification.setType(TYPE_LOW_STOCK);
        notification.setTitle("库存预警通知");
        notification.setContent("《" + bookTitle + "》当前库存为 " + currentStock + "，已低于预警阈值 " + threshold + "，请及时补货。");
        notification.setBookId(bookId);
        notification.setBookTitle(bookTitle);
        notification.setStockSnapshot(currentStock);
        notification.setIsRead(false);
        notificationMapper.insert(notification);
    }

    @Transactional
    public void reEvaluateStockWarning(Long bookId, String bookTitle, int currentStock, int threshold) {
        if (threshold > 0 && currentStock <= threshold) {
            createLowStockNotification(bookId, bookTitle, currentStock, threshold);
        } else {
            Notification existing = notificationMapper.findUnreadByBookIdAndType(bookId, TYPE_LOW_STOCK);
            if (existing != null) {
                notificationMapper.markAsRead(existing.getId());
            }
        }
    }
}
