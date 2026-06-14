package com.example.book.mapper;

import com.example.book.entity.Bookshelf;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface BookshelfMapper {
    List<Bookshelf> findAll();
    Bookshelf findById(@Param("id") Long id);
    void insert(Bookshelf bookshelf);
    void update(Bookshelf bookshelf);
    void deleteById(@Param("id") Long id);
}
