package com.example.book.controller;

import com.example.book.common.Result;
import com.example.book.entity.DuplicateGroup;
import com.example.book.entity.MergeResult;
import com.example.book.service.DuplicateDetectionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/duplicates")
public class DuplicateDetectionController {

    @Autowired
    private DuplicateDetectionService duplicateDetectionService;

    @GetMapping("/detect")
    public Result<List<DuplicateGroup>> detect(
            @RequestParam(defaultValue = "0.6") double threshold) {
        if (threshold < 0 || threshold > 1) {
            return Result.error("阈值必须在0-1之间");
        }
        List<DuplicateGroup> groups = duplicateDetectionService.detectDuplicates(threshold);
        return Result.success(groups);
    }

    @PostMapping("/merge")
    public Result<MergeResult> merge(@RequestBody MergeResult.MergeRequest request) {
        try {
            MergeResult result = duplicateDetectionService.mergeDuplicates(request);
            return Result.success(result);
        } catch (IllegalArgumentException e) {
            return Result.error(e.getMessage());
        }
    }
}
