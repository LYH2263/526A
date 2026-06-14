package com.example.book.mapper;

import com.example.book.entity.Category;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface CategoryMapper {
    List<Category> findAll();
    Category findById(@Param("id") Long id);
    List<Category> findByParentId(@Param("parentId") Long parentId);
    int insert(Category category);
    int update(Category category);
    int deleteById(@Param("id") Long id);
    int countChildren(@Param("parentId") Long parentId);
    int countBooksInCategory(@Param("categoryId") Long categoryId);
    List<Long> findAllDescendantIds(@Param("parentId") Long parentId);
}
