package com.example.book.controller;

import com.example.book.common.PageResult;
import com.example.book.common.Result;
import com.example.book.entity.BookReview;
import com.example.book.service.BookReviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class BookReviewController {

    @Autowired
    private BookReviewService bookReviewService;

    @GetMapping("/books/{bookId}/reviews")
    public Result<PageResult<BookReview>> getReviews(
            @PathVariable Long bookId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "time") String sortBy,
            @RequestParam(defaultValue = "desc") String sortOrder) {
        PageResult<BookReview> result = bookReviewService.getReviewsByBookId(bookId, page, size, sortBy, sortOrder);
        return Result.success(result);
    }

    @GetMapping("/books/{bookId}/reviews/my")
    public Result<BookReview> getMyReview(
            @PathVariable Long bookId,
            @RequestParam Long userId) {
        BookReview review = bookReviewService.getMyReview(bookId, userId);
        return Result.success(review);
    }

    @PostMapping("/books/{bookId}/reviews")
    public Result<BookReview> saveOrUpdateReview(
            @PathVariable Long bookId,
            @RequestBody ReviewRequest request) {
        BookReview review = bookReviewService.saveOrUpdateReview(
                bookId, request.getUserId(), request.getRating(), request.getContent());
        return Result.success(review);
    }

    @DeleteMapping("/reviews/{reviewId}")
    public Result<Void> deleteReview(
            @PathVariable Long reviewId,
            @RequestParam Long userId) {
        bookReviewService.deleteReview(reviewId, userId);
        return Result.success(null);
    }

    public static class ReviewRequest {
        private Long userId;
        private Integer rating;
        private String content;

        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
        public Integer getRating() { return rating; }
        public void setRating(Integer rating) { this.rating = rating; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
    }
}
