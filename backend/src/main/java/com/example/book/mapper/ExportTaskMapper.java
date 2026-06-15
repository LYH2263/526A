package com.example.book.mapper;

import com.example.book.entity.ExportTask;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface ExportTaskMapper {
    int insert(ExportTask task);

    ExportTask findById(@Param("id") Long id);

    List<ExportTask> findByUserId(@Param("userId") Long userId);

    int updateProgress(@Param("id") Long id,
                       @Param("processedRows") Long processedRows,
                       @Param("progress") Integer progress,
                       @Param("status") String status);

    int updateStatus(@Param("id") Long id,
                     @Param("status") String status,
                     @Param("errorMessage") String errorMessage);

    int updateCompleted(@Param("id") Long id,
                        @Param("filePath") String filePath,
                        @Param("fileName") String fileName,
                        @Param("fileSize") Long fileSize,
                        @Param("totalRows") Long totalRows,
                        @Param("completedAt") LocalDateTime completedAt);

    int incrementRetryCount(@Param("id") Long id);

    List<ExportTask> findExpiredTasks(@Param("expireTime") LocalDateTime expireTime);

    int deleteById(@Param("id") Long id);

    int deleteByFilePath(@Param("filePath") String filePath);
}
