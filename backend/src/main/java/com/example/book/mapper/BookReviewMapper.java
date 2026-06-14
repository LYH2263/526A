package com.example.book.mapper;

import com.example.book.entity.BookReview;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface BookReviewMapper {
    BookReview findById(@Param("id") Long id);

    BookReview findByBookIdAndUserId(@Param("bookId") Long bookId, @Param("userId") Long userId);

    List<BookReview> findByBookId(
            @Param("bookId") Long bookId,
            @Param("sortBy") String sortBy,
            @Param("sortOrder") String sortOrder,
            @Param("offset") int offset,
            @Param("size") int size
    );

    long countByBookId(@Param("bookId") Long bookId);

    int insert(BookReview review);

    int update(BookReview review);

    int deleteById(@Param("id") Long id);

    double calculateAvgRating(@Param("bookId") Long bookId);

    int countReviews(@Param("bookId") Long bookId);

    int deleteConflictingReviewsBeforeMigrate(@Param("fromBookId") Long fromBookId, @Param("toBookId") Long toBookId);

    int migrateReviews(@Param("fromBookId") Long fromBookId, @Param("toBookId") Long toBookId);
}
