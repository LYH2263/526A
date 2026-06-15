package com.example.book.mapper;

import com.example.book.entity.Book;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface BookMapper {
    List<Book> findAll();
    List<Book> findByCategoryIds(@Param("categoryIds") List<Long> categoryIds);
    List<Book> findUncategorized();
    Book findById(@Param("id") Long id);
    int insert(Book book);
    int update(Book book);
    int deleteById(@Param("id") Long id);

    int decreaseStock(@Param("id") Long id);

    int increaseStock(@Param("id") Long id);

    int countBorrowedBooks();

    int updateRatingStats(@Param("id") Long id);

    List<Book> findByIds(@Param("ids") List<Long> ids);

    int updateWithVersion(Book book);

    long countAll();

    long countByCategoryIds(@Param("categoryIds") List<Long> categoryIds);

    long countUncategorized();

    List<Book> findAllWithPagination(@Param("offset") long offset, @Param("limit") int limit);

    List<Book> findByCategoryIdsWithPagination(@Param("categoryIds") List<Long> categoryIds,
                                                @Param("offset") long offset, @Param("limit") int limit);

    List<Book> findUncategorizedWithPagination(@Param("offset") long offset, @Param("limit") int limit);
}
