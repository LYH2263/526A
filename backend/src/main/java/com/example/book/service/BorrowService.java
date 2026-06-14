package com.example.book.service;

import com.example.book.entity.Book;
import com.example.book.entity.BorrowRecord;
import com.example.book.mapper.BookMapper;
import com.example.book.mapper.BorrowRecordMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class BorrowService {

    @Autowired
    private BookMapper bookMapper;

    @Autowired
    private BorrowRecordMapper borrowRecordMapper;

    @Autowired
    private NotificationService notificationService;

    @Transactional(rollbackFor = Exception.class)
    public BorrowRecord borrowBook(Long bookId, String borrower, Integer borrowDays) {
        Book book = bookMapper.findById(bookId);
        if (book == null) {
            throw new RuntimeException("图书不存在");
        }

        BorrowRecord existing = borrowRecordMapper.findActiveByBookAndBorrower(bookId, borrower);
        if (existing != null) {
            throw new RuntimeException("您已借阅此书，尚未归还");
        }

        if (book.getAvailableStock() == null || book.getAvailableStock() <= 0) {
            throw new RuntimeException("库存不足，无法借阅");
        }

        int affected = bookMapper.decreaseStock(bookId, book.getVersion());
        if (affected == 0) {
            throw new RuntimeException("借阅失败，请稍后重试");
        }

        BorrowRecord record = new BorrowRecord();
        record.setBookId(bookId);
        record.setBookTitle(book.getTitle());
        record.setBorrower(borrower);
        record.setBorrowTime(LocalDateTime.now());
        int days = borrowDays != null ? borrowDays : 30;
        record.setDueTime(LocalDateTime.now().plusDays(days));
        record.setStatus("BORROWED");

        borrowRecordMapper.insert(record);

        evaluateStockWarning(bookId);

        return record;
    }

    @Transactional(rollbackFor = Exception.class)
    public BorrowRecord returnBook(Long recordId) {
        BorrowRecord record = borrowRecordMapper.findById(recordId);
        if (record == null) {
            throw new RuntimeException("借阅记录不存在");
        }

        if ("RETURNED".equals(record.getStatus())) {
            return record;
        }

        int affected = borrowRecordMapper.updateReturnStatus(recordId, LocalDateTime.now());
        if (affected == 0) {
            throw new RuntimeException("归还失败，请稍后重试");
        }

        bookMapper.increaseStock(record.getBookId());

        evaluateStockWarning(record.getBookId());

        BorrowRecord updated = borrowRecordMapper.findById(recordId);
        return updated;
    }

    private void evaluateStockWarning(Long bookId) {
        Book book = bookMapper.findById(bookId);
        if (book != null) {
            int stock = book.getAvailableStock() != null ? book.getAvailableStock() : 0;
            int threshold = book.getWarnThreshold() != null ? book.getWarnThreshold() : 0;
            notificationService.reEvaluateStockWarning(bookId, book.getTitle(), stock, threshold);
        }
    }

    public List<BorrowRecord> listRecords(String status, String borrower) {
        List<BorrowRecord> records;
        if (borrower != null && !borrower.isEmpty()) {
            records = borrowRecordMapper.findByBorrower(borrower, status);
        } else {
            records = borrowRecordMapper.findAll(status);
        }

        LocalDateTime now = LocalDateTime.now();
        for (BorrowRecord record : records) {
            boolean isOverdue = "BORROWED".equals(record.getStatus())
                    && record.getDueTime() != null
                    && record.getDueTime().isBefore(now);
            record.setOverdue(isOverdue);
        }

        return records;
    }

    public int countBorrowedBooks() {
        return bookMapper.countBorrowedBooks();
    }
}
