package com.example.book.controller;

import com.example.book.common.Result;
import com.example.book.entity.BorrowRecord;
import com.example.book.service.BorrowService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/borrow")
public class BorrowController {

    @Autowired
    private BorrowService borrowService;

    @PostMapping("/borrow")
    public Result<BorrowRecord> borrow(@RequestBody Map<String, Object> params) {
        Long bookId = Long.valueOf(params.get("bookId").toString());
        String borrower = params.get("borrower").toString();
        Integer borrowDays = params.get("borrowDays") != null
                ? Integer.valueOf(params.get("borrowDays").toString())
                : null;
        BorrowRecord record = borrowService.borrowBook(bookId, borrower, borrowDays);
        return Result.success(record);
    }

    @PostMapping("/return/{id}")
    public Result<BorrowRecord> returnBook(@PathVariable Long id) {
        BorrowRecord record = borrowService.returnBook(id);
        return Result.success(record);
    }

    @GetMapping("/records")
    public Result<List<BorrowRecord>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String borrower) {
        List<BorrowRecord> records = borrowService.listRecords(status, borrower);
        return Result.success(records);
    }

    @GetMapping("/stats/borrowed-count")
    public Result<Integer> getBorrowedCount() {
        int count = borrowService.countBorrowedBooks();
        return Result.success(count);
    }
}
