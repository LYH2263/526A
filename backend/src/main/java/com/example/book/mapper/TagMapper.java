package com.example.book.mapper;

import com.example.book.entity.Tag;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface TagMapper {
    List<Tag> findAll();
    Tag findById(@Param("id") Long id);
    Tag findByName(@Param("name") String name);
    int insert(Tag tag);
    int update(Tag tag);
    int deleteById(@Param("id") Long id);
    int countBooksByTagId(@Param("tagId") Long tagId);
    List<Tag> findByBookId(@Param("bookId") Long bookId);
    int insertBookTag(@Param("bookId") Long bookId, @Param("tagId") Long tagId);
    int deleteBookTag(@Param("bookId") Long bookId, @Param("tagId") Long tagId);
    int deleteBookTagsByBookId(@Param("bookId") Long bookId);
    int deleteBookTagsByTagId(@Param("tagId") Long tagId);
    List<Long> findBookIdsByTagIdsAnd(@Param("tagIds") List<Long> tagIds, @Param("tagCount") int tagCount);
    List<Long> findBookIdsByTagIdsOr(@Param("tagIds") List<Long> tagIds);

    int migrateBookTags(@Param("fromBookId") Long fromBookId, @Param("toBookId") Long toBookId);
}
