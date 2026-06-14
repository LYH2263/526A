package com.example.book.entity;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class Book {
    private Long id;
    private String title;
    private String author;
    private BigDecimal price;
    private LocalDate publishDate;
    private String description;
}
