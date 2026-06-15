package com.example.book.controller;

import com.example.book.common.Result;
import com.example.book.dto.BookExportRequest;
import com.example.book.entity.ExportTask;
import com.example.book.service.ExportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/export")
public class ExportController {

    @Autowired
    private ExportService exportService;

    @PostMapping("/books")
    public Result<ExportTask> createBookExport(
            @RequestBody BookExportRequest request,
            @RequestParam Long userId,
            @RequestParam String username) {
        ExportTask task = exportService.createBookExportTask(request, userId, username);
        return Result.success(task);
    }

    @GetMapping("/tasks/{taskId}")
    public Result<ExportTask> getTask(@PathVariable Long taskId) {
        ExportTask task = exportService.getTaskById(taskId);
        if (task == null) {
            return Result.error("任务不存在");
        }
        return Result.success(task);
    }

    @GetMapping("/tasks")
    public Result<List<ExportTask>> getTasks(@RequestParam Long userId) {
        List<ExportTask> tasks = exportService.getTasksByUserId(userId);
        return Result.success(tasks);
    }

    @PostMapping("/tasks/{taskId}/retry")
    public Result<ExportTask> retryTask(
            @PathVariable Long taskId,
            @RequestParam Long userId) {
        try {
            ExportTask task = exportService.retryTask(taskId, userId);
            return Result.success(task);
        } catch (RuntimeException e) {
            return Result.error(e.getMessage());
        }
    }

    @GetMapping("/download/{taskId}")
    public ResponseEntity<byte[]> download(
            @PathVariable Long taskId,
            @RequestParam Long userId) {
        try {
            File file = exportService.getExportFile(taskId, userId);
            byte[] fileContent = Files.readAllBytes(file.toPath());

            ExportTask task = exportService.getTaskById(taskId);
            String fileName = task.getFileName() != null ? task.getFileName() : "export";
            String encodedFileName = URLEncoder.encode(fileName, StandardCharsets.UTF_8.toString())
                    .replaceAll("\\+", "%20");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", encodedFileName);
            headers.setContentLength(fileContent.length);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(fileContent);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/tasks/{taskId}/progress")
    public Result<Map<String, Object>> getProgress(@PathVariable Long taskId) {
        ExportTask task = exportService.getTaskById(taskId);
        if (task == null) {
            return Result.error("任务不存在");
        }
        return Result.success(Map.of(
                "taskId", task.getId(),
                "status", task.getStatus(),
                "progress", task.getProgress(),
                "processedRows", task.getProcessedRows(),
                "totalRows", task.getTotalRows(),
                "errorMessage", task.getErrorMessage() != null ? task.getErrorMessage() : ""
        ));
    }
}
