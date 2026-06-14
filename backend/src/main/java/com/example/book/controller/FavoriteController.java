package com.example.book.controller;

import com.example.book.common.Result;
import com.example.book.entity.FavoriteWithBook;
import com.example.book.service.FavoriteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {

    @Autowired
    private FavoriteService favoriteService;

    @PostMapping("/add")
    public Result<Map<String, Object>> addFavorite(@RequestBody Map<String, Object> body) {
        Long userId = getLong(body, "userId");
        Long bookId = getLong(body, "bookId");
        if (userId == null || bookId == null) {
            return Result.error("参数不完整");
        }
        Map<String, Object> result = favoriteService.addFavorite(userId, bookId);
        if (Boolean.TRUE.equals(result.get("success"))) {
            return Result.success(result);
        }
        return Result.error((String) result.get("message"));
    }

    @PostMapping("/remove")
    public Result<Map<String, Object>> removeFavorite(@RequestBody Map<String, Object> body) {
        Long userId = getLong(body, "userId");
        Long bookId = getLong(body, "bookId");
        if (userId == null || bookId == null) {
            return Result.error("参数不完整");
        }
        return Result.success(favoriteService.removeFavorite(userId, bookId));
    }

    @PostMapping("/toggle")
    public Result<Map<String, Object>> toggleFavorite(@RequestBody Map<String, Object> body) {
        Long userId = getLong(body, "userId");
        Long bookId = getLong(body, "bookId");
        Boolean favorited = (Boolean) body.get("favorited");
        if (userId == null || bookId == null) {
            return Result.error("参数不完整");
        }
        Map<String, Object> result = favoriteService.toggleFavorite(userId, bookId, favorited);
        if (Boolean.TRUE.equals(result.get("success"))) {
            return Result.success(result);
        }
        return Result.error((String) result.get("message"));
    }

    @GetMapping("/mine")
    public Result<List<FavoriteWithBook>> getMyFavorites(
            @RequestParam Long userId,
            @RequestParam(required = false, defaultValue = "desc") String sortOrder) {
        if (userId == null) {
            return Result.error("用户未登录");
        }
        return Result.success(favoriteService.getMyFavorites(userId, sortOrder));
    }

    private Long getLong(Map<String, Object> body, String key) {
        Object val = body.get(key);
        if (val == null) return null;
        if (val instanceof Number) {
            return ((Number) val).longValue();
        }
        try {
            return Long.parseLong(val.toString());
        } catch (Exception e) {
            return null;
        }
    }
}
