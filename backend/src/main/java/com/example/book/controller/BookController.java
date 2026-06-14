package com.example.book.controller;

import com.example.book.common.Result;
import com.example.book.entity.Book;
import com.example.book.service.BookService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/books")
public class BookController {

    @Autowired
    private BookService bookService;

    @GetMapping
    public Result<List<Book>> list() {
        return Result.success(bookService.findAll());
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
