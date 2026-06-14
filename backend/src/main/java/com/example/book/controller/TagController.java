package com.example.book.controller;

import com.example.book.common.Result;
import com.example.book.entity.Tag;
import com.example.book.service.TagService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tags")
public class TagController {

    @Autowired
    private TagService tagService;

    @GetMapping
    public Result<List<Tag>> list() {
        return Result.success(tagService.findAll());
    }

    @GetMapping("/{id}")
    public Result<Tag> get(@PathVariable Long id) {
        return Result.success(tagService.findById(id));
    }

    @GetMapping("/book/{bookId}")
    public Result<List<Tag>> getByBookId(@PathVariable Long bookId) {
        return Result.success(tagService.findByBookId(bookId));
    }

    @PostMapping
    public Result<Tag> save(@RequestBody Tag tag) {
        return Result.success(tagService.save(tag));
    }

    @PostMapping("/create-if-absent")
    public Result<Tag> createIfAbsent(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        return Result.success(tagService.createIfAbsent(name));
    }

    @PutMapping
    public Result<Void> update(@RequestBody Tag tag) {
        tagService.save(tag);
        return Result.success(null);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        tagService.deleteById(id);
        return Result.success(null);
    }

    @PostMapping("/book/{bookId}/tag/{tagId}")
    public Result<Void> assignTag(@PathVariable Long bookId, @PathVariable Long tagId) {
        tagService.assignTagToBook(bookId, tagId);
        return Result.success(null);
    }

    @DeleteMapping("/book/{bookId}/tag/{tagId}")
    public Result<Void> removeTag(@PathVariable Long bookId, @PathVariable Long tagId) {
        tagService.removeTagFromBook(bookId, tagId);
        return Result.success(null);
    }

    @GetMapping("/filter-books")
    public Result<List<Long>> filterBooks(
            @RequestParam List<Long> tagIds,
            @RequestParam(defaultValue = "OR") String semantic) {
        return Result.success(tagService.findBookIdsByTagIds(tagIds, semantic));
    }
}
