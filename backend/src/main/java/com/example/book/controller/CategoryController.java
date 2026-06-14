package com.example.book.controller;

import com.example.book.common.Result;
import com.example.book.entity.Category;
import com.example.book.service.CategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    @Autowired
    private CategoryService categoryService;

    @GetMapping("/tree")
    public Result<Map<String, Object>> getCategoryTree() {
        List<Category> tree = categoryService.getCategoryTree();
        int uncategorizedCount = categoryService.countUncategorizedBooks();
        Map<String, Object> result = new HashMap<>();
        result.put("tree", tree);
        result.put("uncategorizedCount", uncategorizedCount);
        return Result.success(result);
    }

    @GetMapping
    public Result<List<Category>> list() {
        return Result.success(categoryService.findAll());
    }

    @GetMapping("/{id}")
    public Result<Category> get(@PathVariable Long id) {
        return Result.success(categoryService.findById(id));
    }

    @GetMapping("/{id}/descendant-ids")
    public Result<List<Long>> getDescendantIds(@PathVariable Long id) {
        return Result.success(categoryService.getCategoryAndDescendantIds(id));
    }

    @PostMapping
    public Result<Void> save(@RequestBody Category category) {
        categoryService.save(category);
        return Result.success(null);
    }

    @PutMapping
    public Result<Void> update(@RequestBody Category category) {
        categoryService.save(category);
        return Result.success(null);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        categoryService.deleteById(id);
        return Result.success(null);
    }
}
