package com.example.book.service;

import com.example.book.entity.Book;
import com.example.book.mapper.BookMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BookService {

    @Autowired
    private BookMapper bookMapper;

    public List<Book> findAll() {
        return bookMapper.findAll();
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
