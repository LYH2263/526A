package com.example.book.service;

import com.example.book.dto.BookExportRequest;
import com.example.book.entity.ExportTask;
import com.example.book.mapper.ExportTaskMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.io.File;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ExportService {

    @Autowired
    private ExportTaskMapper exportTaskMapper;

    @Autowired
    private BookExportExecutor bookExportExecutor;

    @Autowired
    private ObjectMapper objectMapper;

    @Value("${export.file.dir:./export-files}")
    private String exportFileDir;

    @PostConstruct
    public void init() {
        File dir = new File(exportFileDir);
        if (!dir.exists()) {
            dir.mkdirs();
        }
    }

    public ExportTask createBookExportTask(BookExportRequest request, Long userId, String username) {
        ExportTask task = new ExportTask();
        task.setTaskName(request.getTaskName() != null ? request.getTaskName() : "图书数据导出");
        task.setExportType("BOOK");
        task.setFileFormat(request.getFormat() != null ? request.getFormat().toUpperCase() : "EXCEL");
        task.setStatus("PENDING");
        task.setTotalRows(0L);
        task.setProcessedRows(0L);
        task.setProgress(0);
        task.setUserId(userId);
        task.setUsername(username);
        task.setRetryCount(0);

        try {
            task.setFilterParams(objectMapper.writeValueAsString(request));
        } catch (Exception e) {
            task.setFilterParams("{}");
        }

        exportTaskMapper.insert(task);

        executeExportAsync(task.getId());

        return task;
    }

    @Async("exportTaskExecutor")
    public void executeExportAsync(Long taskId) {
        ExportTask task = exportTaskMapper.findById(taskId);
        if (task == null) {
            return;
        }

        try {
            exportTaskMapper.updateStatus(taskId, "PROCESSING", null);

            String fileExtension = getFileExtension(task.getFileFormat());
            String fileName = task.getTaskName() + "_" + System.currentTimeMillis() + "." + fileExtension;
            String filePath = exportFileDir + File.separator + UUID.randomUUID().toString() + "." + fileExtension;

            if ("BOOK".equals(task.getExportType())) {
                bookExportExecutor.executeExport(task, filePath);
            }

            File file = new File(filePath);
            if (file.exists()) {
                exportTaskMapper.updateCompleted(taskId, filePath, fileName, file.length(),
                        task.getProcessedRows(), LocalDateTime.now());
            } else {
                throw new RuntimeException("导出文件生成失败");
            }
        } catch (Exception e) {
            exportTaskMapper.updateStatus(taskId, "FAILED", e.getMessage());
        }
    }

    private String getFileExtension(String format) {
        switch (format) {
            case "CSV":
                return "csv";
            case "PDF":
                return "pdf";
            case "EXCEL":
            default:
                return "xlsx";
        }
    }

    public ExportTask getTaskById(Long taskId) {
        return exportTaskMapper.findById(taskId);
    }

    public List<ExportTask> getTasksByUserId(Long userId) {
        return exportTaskMapper.findByUserId(userId);
    }

    public ExportTask retryTask(Long taskId, Long userId) {
        ExportTask task = exportTaskMapper.findById(taskId);
        if (task == null) {
            throw new RuntimeException("任务不存在");
        }
        if (!task.getUserId().equals(userId)) {
            throw new RuntimeException("无权操作此任务");
        }
        if (!"FAILED".equals(task.getStatus())) {
            throw new RuntimeException("只有失败的任务才能重试");
        }

        exportTaskMapper.incrementRetryCount(taskId);
        exportTaskMapper.updateStatus(taskId, "PENDING", null);
        exportTaskMapper.updateProgress(taskId, 0L, 0, "PENDING");

        executeExportAsync(taskId);

        return exportTaskMapper.findById(taskId);
    }

    public File getExportFile(Long taskId, Long userId) {
        ExportTask task = exportTaskMapper.findById(taskId);
        if (task == null) {
            throw new RuntimeException("任务不存在");
        }
        if (!task.getUserId().equals(userId)) {
            throw new RuntimeException("无权下载此文件");
        }
        if (!"SUCCESS".equals(task.getStatus())) {
            throw new RuntimeException("文件尚未生成完成");
        }

        File file = new File(task.getFilePath());
        if (!file.exists()) {
            throw new RuntimeException("文件不存在");
        }

        return file;
    }
}
