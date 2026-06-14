package com.example.book.service;

import com.example.book.entity.Book;
import com.example.book.entity.Tag;
import com.example.book.mapper.BookMapper;
import com.example.book.mapper.CategoryMapper;
import com.example.book.mapper.TagMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class BookService {

    @Autowired
    private BookMapper bookMapper;

    @Autowired
    private CategoryMapper categoryMapper;

    @Autowired
    private TagMapper tagMapper;

    public List<Book> findAll() {
        List<Book> books = bookMapper.findAll();
        enrichTags(books);
        return books;
    }

    public List<Book> findByCategory(Long categoryId, boolean includeDescendants) {
        if (categoryId == null) {
            List<Book> books = bookMapper.findUncategorized();
            enrichTags(books);
            return books;
        }
        if (includeDescendants) {
            List<Long> ids = new ArrayList<>();
            ids.add(categoryId);
            List<Long> descendants = categoryMapper.findAllDescendantIds(categoryId);
            if (descendants != null) {
                ids.addAll(descendants);
            }
            List<Book> books = bookMapper.findByCategoryIds(ids);
            enrichTags(books);
            return books;
        } else {
            List<Long> ids = new ArrayList<>();
            ids.add(categoryId);
            List<Book> books = bookMapper.findByCategoryIds(ids);
            enrichTags(books);
            return books;
        }
    }

    public Book findById(Long id) {
        Book book = bookMapper.findById(id);
        if (book != null) {
            book.setTags(tagMapper.findByBookId(id));
        }
        return book;
    }

    public List<Book> findByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return new ArrayList<>();
        }
        List<Book> books = bookMapper.findByIds(ids);
        enrichTags(books);
        return books;
    }

    @Transactional
    public void save(Book book) {
        if (book.getId() == null) {
            if (book.getTotalStock() == null) {
                book.setTotalStock(0);
            }
            if (book.getAvailableStock() == null) {
                book.setAvailableStock(book.getTotalStock());
            }
            bookMapper.insert(book);
            if (book.getTagIds() != null) {
                for (Long tagId : book.getTagIds()) {
                    tagMapper.insertBookTag(book.getId(), tagId);
                }
            }
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
            tagMapper.deleteBookTagsByBookId(book.getId());
            if (book.getTagIds() != null) {
                for (Long tagId : book.getTagIds()) {
                    tagMapper.insertBookTag(book.getId(), tagId);
                }
            }
        }
    }

    public void deleteById(Long id) {
        bookMapper.deleteById(id);
    }

    private void enrichTags(List<Book> books) {
        for (Book book : books) {
            book.setTags(tagMapper.findByBookId(book.getId()));
        }
    }
}
