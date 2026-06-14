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
            if (book.getTotalStock() == null) {
                book.setTotalStock(0);
            }
            if (book.getAvailableStock() == null) {
                book.setAvailableStock(book.getTotalStock());
            }
            bookMapper.insert(book);
        } else {
            Book existing = bookMapper.findById(book.getId());
            if (existing != null && book.getTotalStock() != null) {
                int diff = book.getTotalStock() - (existing.getTotalStock() != null ? existing.getTotalStock() : 0);
                int newAvailable = (existing.getAvailableStock() != null ? existing.getAvailableStock() : 0) + diff;
                if (newAvailable < 0) {
                    newAvailable = 0;
                }
                book.setAvailableStock(newAvailable);
            }
            bookMapper.update(book);
        }
    }

    public void deleteById(Long id) {
        bookMapper.deleteById(id);
    }
}
