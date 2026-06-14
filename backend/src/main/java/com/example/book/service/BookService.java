package com.example.book.service;

import com.example.book.entity.Book;
import com.example.book.mapper.BookMapper;
import com.example.book.mapper.CategoryMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class BookService {

    @Autowired
    private BookMapper bookMapper;

    @Autowired
    private CategoryMapper categoryMapper;

    public List<Book> findAll() {
        return bookMapper.findAll();
    }

    public List<Book> findByCategory(Long categoryId, boolean includeDescendants) {
        if (categoryId == null) {
            return bookMapper.findUncategorized();
        }
        if (includeDescendants) {
            List<Long> ids = new ArrayList<>();
            ids.add(categoryId);
            List<Long> descendants = categoryMapper.findAllDescendantIds(categoryId);
            if (descendants != null) {
                ids.addAll(descendants);
            }
            return bookMapper.findByCategoryIds(ids);
        } else {
            List<Long> ids = new ArrayList<>();
            ids.add(categoryId);
            return bookMapper.findByCategoryIds(ids);
        }
    }

    public Book findById(Long id) {
        return bookMapper.findById(id);
    }

    public void save(Book book) {
        if (book.getId() == null) {
            bookMapper.insert(book);
        } else {
            bookMapper.update(book);
        }
    }

    public void deleteById(Long id) {
        bookMapper.deleteById(id);
    }
}
