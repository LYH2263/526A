package com.example.book.controller;

import com.example.book.common.Result;
import com.example.book.entity.*;
import com.example.book.service.ShelfLayoutService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/shelf-layout")
public class ShelfLayoutController {

    @Autowired
    private ShelfLayoutService shelfLayoutService;

    @GetMapping
    public Result<ShelfLayout> loadLayout() {
        return Result.success(shelfLayoutService.loadLayout());
    }

    @PostMapping
    public Result<Void> saveLayout(@RequestBody ShelfLayout layout) {
        shelfLayoutService.saveLayout(layout);
        return Result.success(null);
    }

    @GetMapping("/capacity/{layerId}")
    public Result<Map<String, Object>> checkCapacity(
            @PathVariable Long layerId,
            @RequestParam(defaultValue = "1") int addCount) {
        return Result.success(shelfLayoutService.checkCapacity(layerId, addCount));
    }

    @GetMapping("/unplaced-books")
    public Result<List<Book>> getUnplacedBooks() {
        return Result.success(shelfLayoutService.getUnplacedBooks());
    }

    @PostMapping("/bookshelves")
    public Result<Bookshelf> createBookshelf(@RequestBody Bookshelf shelf) {
        return Result.success(shelfLayoutService.createBookshelf(shelf));
    }

    @PutMapping("/bookshelves")
    public Result<Bookshelf> updateBookshelf(@RequestBody Bookshelf shelf) {
        return Result.success(shelfLayoutService.updateBookshelf(shelf));
    }

    @DeleteMapping("/bookshelves/{id}")
    public Result<Void> deleteBookshelf(@PathVariable Long id) {
        shelfLayoutService.deleteBookshelf(id);
        return Result.success(null);
    }

    @PostMapping("/bookshelves/{shelfId}/layers")
    public Result<ShelfLayer> addLayer(@PathVariable Long shelfId) {
        return Result.success(shelfLayoutService.addLayer(shelfId));
    }

    @PutMapping("/layers")
    public Result<ShelfLayer> updateLayer(@RequestBody ShelfLayer layer) {
        return Result.success(shelfLayoutService.updateLayer(layer));
    }

    @DeleteMapping("/layers/{layerId}")
    public Result<Void> removeLayer(@PathVariable Long layerId) {
        shelfLayoutService.removeLayer(layerId);
        return Result.success(null);
    }

    @PostMapping("/place")
    public Result<Map<String, Object>> placeBook(
            @RequestParam Long bookId,
            @RequestParam Long layerId,
            @RequestParam(required = false) Integer positionIndex) {
        Map<String, Object> result = shelfLayoutService.placeBook(bookId, layerId, positionIndex);
        if ((Boolean) result.get("valid")) {
            return Result.success(result);
        } else {
            return Result.error((String) result.get("message"));
        }
    }

    @DeleteMapping("/place/book/{bookId}")
    public Result<Void> removeBookFromShelf(@PathVariable Long bookId) {
        shelfLayoutService.removeBookFromShelf(bookId);
        return Result.success(null);
    }

    @PostMapping("/batch-move")
    public Result<Map<String, Object>> batchMoveBooks(@RequestBody Map<String, Object> params) {
        List<Long> bookIds = (List<Long>) params.get("bookIds");
        Long targetLayerId = Long.valueOf(params.get("targetLayerId").toString());
        Integer startPosition = params.get("startPosition") != null ? 
                Integer.valueOf(params.get("startPosition").toString()) : null;
        
        Map<String, Object> result = shelfLayoutService.batchMoveBooks(bookIds, targetLayerId, startPosition);
        if ((Boolean) result.get("valid")) {
            return Result.success(result);
        } else {
            return Result.error((String) result.get("message"));
        }
    }
}
