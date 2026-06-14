package com.example.book.controller;

import com.example.book.common.Result;
import com.example.book.entity.Book;
import com.example.book.service.BookService;
import com.example.book.service.FavoriteService;
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

    @Autowired
    private FavoriteService favoriteService;

    @GetMapping
    public Result<List<Book>> list(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false, defaultValue = "false") boolean filterByCategory,
            @RequestParam(required = false) List<Long> tagIds,
            @RequestParam(required = false, defaultValue = "OR") String tagSemantic,
            @RequestParam(required = false) Long userId) {
        List<Book> books;
        if (tagIds != null && !tagIds.isEmpty()) {
            List<Long> bookIds = tagService.findBookIdsByTagIds(tagIds, tagSemantic);
            books = bookService.findByIds(bookIds);
        } else if (filterByCategory) {
            books = bookService.findByCategory(categoryId, true);
        } else {
            books = bookService.findAll();
        }
        favoriteService.enrichBooksWithFavoriteInfo(books, userId);
        return Result.success(books);
    }

    @GetMapping("/uncategorized")
    public Result<List<Book>> listUncategorized(@RequestParam(required = false) Long userId) {
        List<Book> books = bookService.findByCategory(null, false);
        favoriteService.enrichBooksWithFavoriteInfo(books, userId);
        return Result.success(books);
    }

    @GetMapping("/{id}")
    public Result<Book> get(@PathVariable Long id, @RequestParam(required = false) Long userId) {
        Book book = bookService.findById(id);
        if (book != null && userId != null) {
            favoriteService.enrichBooksWithFavoriteInfo(java.util.Collections.singletonList(book), userId);
        } else if (book != null) {
            favoriteService.enrichBooksWithFavoriteInfo(java.util.Collections.singletonList(book), null);
        }
        return Result.success(book);
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

    @PutMapping("/{id}/stock")
    public Result<Void> adjustStock(
            @PathVariable Long id,
            @RequestParam int delta) {
        bookService.adjustStock(id, delta);
        return Result.success(null);
    }
}
