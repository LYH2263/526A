package com.example.book.mapper;

import com.example.book.entity.Book;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface BookMapper {
    List<Book> findAll();
    Book findById(@Param("id") Long id);
    int insert(Book book);
    int update(Book book);
    int deleteById(@Param("id") Long id);
}
