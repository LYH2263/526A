package com.example.book.mapper;

import com.example.book.entity.BookPlacement;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface BookPlacementMapper {
    List<BookPlacement> findAll();
    List<BookPlacement> findByLayerId(@Param("layerId") Long layerId);
    List<BookPlacement> findByBookshelfId(@Param("bookshelfId") Long bookshelfId);
    BookPlacement findByBookId(@Param("bookId") Long bookId);
    BookPlacement findById(@Param("id") Long id);
    void insert(BookPlacement placement);
    void update(BookPlacement placement);
    void deleteById(@Param("id") Long id);
    void deleteByBookId(@Param("bookId") Long bookId);
    void deleteByLayerId(@Param("layerId") Long layerId);
    void deleteByBookshelfId(@Param("bookshelfId") Long bookshelfId);
    void deleteAll();

    int countByBookId(@Param("bookId") Long bookId);
}
