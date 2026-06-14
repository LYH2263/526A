package com.example.book.mapper;

import com.example.book.entity.ShelfLayer;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface ShelfLayerMapper {
    List<ShelfLayer> findByBookshelfId(@Param("bookshelfId") Long bookshelfId);
    ShelfLayer findById(@Param("id") Long id);
    void insert(ShelfLayer layer);
    void update(ShelfLayer layer);
    void deleteById(@Param("id") Long id);
    void deleteByBookshelfId(@Param("bookshelfId") Long bookshelfId);
    int countByLayerId(@Param("layerId") Long layerId);
}
