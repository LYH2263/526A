package com.example.book.service;

import com.example.book.entity.Book;
import com.example.book.entity.FavoriteWithBook;
import com.example.book.mapper.BookMapper;
import com.example.book.mapper.FavoriteMapper;
import com.example.book.mapper.TagMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class FavoriteService {

    @Autowired
    private FavoriteMapper favoriteMapper;

    @Autowired
    private BookMapper bookMapper;

    @Autowired
    private TagMapper tagMapper;

    @Transactional
    public Map<String, Object> addFavorite(Long userId, Long bookId) {
        Map<String, Object> result = new HashMap<>();
        Book book = bookMapper.findById(bookId);
        if (book == null) {
            result.put("success", false);
            result.put("message", "图书不存在或已被删除");
            return result;
        }
        favoriteMapper.insert(userId, bookId);
        int count = favoriteMapper.countByBookId(bookId);
        result.put("success", true);
        result.put("favoriteCount", count);
        result.put("favorited", true);
        return result;
    }

    @Transactional
    public Map<String, Object> removeFavorite(Long userId, Long bookId) {
        Map<String, Object> result = new HashMap<>();
        favoriteMapper.delete(userId, bookId);
        int count = favoriteMapper.countByBookId(bookId);
        result.put("success", true);
        result.put("favoriteCount", count);
        result.put("favorited", false);
        return result;
    }

    public List<FavoriteWithBook> getMyFavorites(Long userId, String sortOrder) {
        List<FavoriteWithBook> list = favoriteMapper.findByUserId(userId, sortOrder);
        for (FavoriteWithBook item : list) {
            item.setTags(tagMapper.findByBookId(item.getBookId()));
        }
        return list;
    }

    public void enrichBooksWithFavoriteInfo(List<Book> books, Long userId) {
        if (books == null || books.isEmpty()) {
            return;
        }
        Map<Long, Integer> countMap = new HashMap<>();
        Set<Long> favoritedIds = new HashSet<>();
        if (userId != null) {
            List<Long> ids = favoriteMapper.findFavoritedBookIdsByUserId(userId);
            if (ids != null) {
                favoritedIds.addAll(ids);
            }
        }
        for (Book book : books) {
            int count = favoriteMapper.countByBookId(book.getId());
            countMap.put(book.getId(), count);
        }
        for (Book book : books) {
            book.setFavoriteCount(countMap.getOrDefault(book.getId(), 0));
            book.setFavorited(favoritedIds.contains(book.getId()));
        }
    }

    public Map<String, Object> toggleFavorite(Long userId, Long bookId, Boolean favorited) {
        if (Boolean.TRUE.equals(favorited)) {
            return removeFavorite(userId, bookId);
        } else {
            return addFavorite(userId, bookId);
        }
    }
}
