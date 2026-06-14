package com.example.book.service;

import com.example.book.common.PageResult;
import com.example.book.entity.BookReview;
import com.example.book.entity.User;
import com.example.book.mapper.BookMapper;
import com.example.book.mapper.BookReviewMapper;
import com.example.book.mapper.UserMapper;
import com.example.book.util.SensitiveWordFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BookReviewService {

    private static final int MAX_CONTENT_LENGTH = 500;

    @Autowired
    private BookReviewMapper bookReviewMapper;

    @Autowired
    private BookMapper bookMapper;

    @Autowired
    private UserMapper userMapper;

    public PageResult<BookReview> getReviewsByBookId(Long bookId, int page, int size, String sortBy, String sortOrder) {
        int offset = (page - 1) * size;
        List<BookReview> reviews = bookReviewMapper.findByBookId(bookId, sortBy, sortOrder, offset, size);
        long total = bookReviewMapper.countByBookId(bookId);
        return new PageResult<>(reviews, total, page, size);
    }

    public BookReview getMyReview(Long bookId, Long userId) {
        return bookReviewMapper.findByBookIdAndUserId(bookId, userId);
    }

    @Transactional
    public BookReview saveOrUpdateReview(Long bookId, Long userId, Integer rating, String content) {
        if (rating == null || rating < 1 || rating > 5) {
            throw new IllegalArgumentException("评分必须在1-5星之间");
        }

        if (content == null || content.trim().isEmpty()) {
            throw new IllegalArgumentException("评论内容不能为空");
        }

        if (content.length() > MAX_CONTENT_LENGTH) {
            throw new IllegalArgumentException("评论内容不能超过" + MAX_CONTENT_LENGTH + "字");
        }

        String filteredContent = SensitiveWordFilter.filter(content);

        User user = userMapper.findById(userId);
        if (user == null) {
            throw new IllegalArgumentException("用户不存在");
        }

        if (bookMapper.findById(bookId) == null) {
            throw new IllegalArgumentException("图书不存在");
        }

        BookReview existingReview = bookReviewMapper.findByBookIdAndUserId(bookId, userId);

        if (existingReview != null) {
            existingReview.setRating(rating);
            existingReview.setContent(filteredContent);
            bookReviewMapper.update(existingReview);
        } else {
            BookReview review = new BookReview();
            review.setBookId(bookId);
            review.setUserId(userId);
            review.setUsername(user.getUsername());
            review.setRating(rating);
            review.setContent(filteredContent);
            bookReviewMapper.insert(review);
            existingReview = review;
        }

        bookMapper.updateRatingStats(bookId);

        return bookReviewMapper.findById(existingReview.getId());
    }

    @Transactional
    public void deleteReview(Long reviewId, Long userId) {
        BookReview review = bookReviewMapper.findById(reviewId);
        if (review == null) {
            throw new IllegalArgumentException("评论不存在");
        }

        if (!review.getUserId().equals(userId)) {
            throw new IllegalArgumentException("只能删除自己的评论");
        }

        Long bookId = review.getBookId();
        bookReviewMapper.deleteById(reviewId);
        bookMapper.updateRatingStats(bookId);
    }
}
