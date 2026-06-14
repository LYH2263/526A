package com.example.book.mapper;

import com.example.book.entity.BorrowRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface BorrowRecordMapper {

    int insert(BorrowRecord record);

    BorrowRecord findById(@Param("id") Long id);

    List<BorrowRecord> findAll(@Param("status") String status);

    List<BorrowRecord> findByBorrower(@Param("borrower") String borrower, @Param("status") String status);

    int updateReturnStatus(@Param("id") Long id, @Param("returnTime") LocalDateTime returnTime);

    BorrowRecord findActiveByBookAndBorrower(@Param("bookId") Long bookId, @Param("borrower") String borrower);
}
