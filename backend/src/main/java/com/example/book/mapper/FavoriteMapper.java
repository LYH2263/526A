package com.example.book.mapper;

import com.example.book.entity.Favorite;
import com.example.book.entity.FavoriteWithBook;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FavoriteMapper {

    int insert(@Param("userId") Long userId, @Param("bookId") Long bookId);

    int delete(@Param("userId") Long userId, @Param("bookId") Long bookId);

    Favorite findByUserAndBook(@Param("userId") Long userId, @Param("bookId") Long bookId);

    List<FavoriteWithBook> findByUserId(@Param("userId") Long userId, @Param("sortOrder") String sortOrder);

    int countByBookId(@Param("bookId") Long bookId);

    List<Long> findFavoritedBookIdsByUserId(@Param("userId") Long userId);

    int deleteConflictingBeforeMigrate(@Param("fromBookId") Long fromBookId, @Param("toBookId") Long toBookId);

    int migrateFavorites(@Param("fromBookId") Long fromBookId, @Param("toBookId") Long toBookId);
}
