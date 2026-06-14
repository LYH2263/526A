package com.example.book.controller;

import com.example.book.common.Result;
import com.example.book.entity.Book;
import com.example.book.service.BookService;
import com.example.book.service.TagService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/books")
public class BookController {

    @Autowired
    private BookService bookService;

    @Autowired
    private TagService tagService;

    @GetMapping
    public Result<List<Book>> list(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false, defaultValue = "false") boolean filterByCategory,
            @RequestParam(required = false) List<Long> tagIds,
            @RequestParam(required = false, defaultValue = "OR") String tagSemantic) {
        if (tagIds != null && !tagIds.isEmpty()) {
            List<Long> bookIds = tagService.findBookIdsByTagIds(tagIds, tagSemantic);
            return Result.success(bookService.findByIds(bookIds));
        }
        if (filterByCategory) {
            return Result.success(bookService.findByCategory(categoryId, true));
        }
        return Result.success(bookService.findAll());
    }

    @GetMapping("/uncategorized")
    public Result<List<Book>> listUncategorized() {
        return Result.success(bookService.findByCategory(null, false));
    }

    @GetMapping("/{id}")
    public Result<Book> get(@PathVariable Long id) {
        return Result.success(bookService.findById(id));
    }

    @PostMapping
    public Result<Void> save(@RequestBody Book book) {
        bookService.save(book);
        return Result.success(null);
    }

    @PutMapping
    public Result<Void> update(@RequestBody Book book) {
        bookService.save(book);
        return Result.success(null);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        bookService.deleteById(id);
        return Result.success(null);
    }
}
