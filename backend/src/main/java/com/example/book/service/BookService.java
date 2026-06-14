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

    @Autowired
    private NotificationService notificationService;

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
            if (book.getWarnThreshold() == null) {
                book.setWarnThreshold(0);
            }
            bookMapper.insert(book);
            if (book.getTagIds() != null) {
                for (Long tagId : book.getTagIds()) {
                    tagMapper.insertBookTag(book.getId(), tagId);
                }
            }
            evaluateStockWarning(book.getId());
        } else {
            Book existing = bookMapper.findById(book.getId());
            boolean stockChanged = false;
            boolean thresholdChanged = false;
            if (existing != null) {
                if (book.getTotalStock() != null) {
                    int diff = book.getTotalStock() - (existing.getTotalStock() != null ? existing.getTotalStock() : 0);
                    int newAvailable = (existing.getAvailableStock() != null ? existing.getAvailableStock() : 0) + diff;
                    if (newAvailable < 0) {
                        newAvailable = 0;
                    }
                    book.setAvailableStock(newAvailable);
                    stockChanged = true;
                }
                if (book.getWarnThreshold() != null && !book.getWarnThreshold().equals(existing.getWarnThreshold())) {
                    thresholdChanged = true;
                }
            }
            bookMapper.update(book);
            tagMapper.deleteBookTagsByBookId(book.getId());
            if (book.getTagIds() != null) {
                for (Long tagId : book.getTagIds()) {
                    tagMapper.insertBookTag(book.getId(), tagId);
                }
            }
            if (stockChanged || thresholdChanged) {
                evaluateStockWarning(book.getId());
            }
        }
    }

    @Transactional
    public void adjustStock(Long bookId, int stockDelta) {
        Book book = bookMapper.findById(bookId);
        if (book == null) {
            throw new RuntimeException("图书不存在");
        }
        int newTotalStock = (book.getTotalStock() != null ? book.getTotalStock() : 0) + stockDelta;
        int newAvailableStock = (book.getAvailableStock() != null ? book.getAvailableStock() : 0) + stockDelta;
        if (newTotalStock < 0) {
            newTotalStock = 0;
        }
        if (newAvailableStock < 0) {
            newAvailableStock = 0;
        }
        book.setTotalStock(newTotalStock);
        book.setAvailableStock(newAvailableStock);
        bookMapper.update(book);
        evaluateStockWarning(bookId);
    }

    public void evaluateStockWarning(Long bookId) {
        Book book = bookMapper.findById(bookId);
        if (book != null) {
            int stock = book.getAvailableStock() != null ? book.getAvailableStock() : 0;
            int threshold = book.getWarnThreshold() != null ? book.getWarnThreshold() : 0;
            notificationService.reEvaluateStockWarning(bookId, book.getTitle(), stock, threshold);
        }
    }

    public void updateBookTags(Book book) {
        if (book.getId() != null) {
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
