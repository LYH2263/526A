package com.example.book.mapper;

import com.example.book.entity.Notification;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface NotificationMapper {
    int insert(Notification notification);

    Notification findById(@Param("id") Long id);

    List<Notification> findByPage(@Param("offset") int offset, @Param("size") int size);

    long count();

    long countUnread();

    int markAsRead(@Param("id") Long id);

    int markAllAsRead();

    Notification findUnreadByBookIdAndType(@Param("bookId") Long bookId, @Param("type") String type);

    int updateStockSnapshot(@Param("id") Long id, @Param("stockSnapshot") Integer stockSnapshot);

    List<Notification> findByBookIdAndType(@Param("bookId") Long bookId, @Param("type") String type);

    int migrateNotifications(@Param("fromBookId") Long fromBookId, @Param("toBookId") Long toBookId, @Param("toBookTitle") String toBookTitle);

    int countByBookId(@Param("bookId") Long bookId);
}
