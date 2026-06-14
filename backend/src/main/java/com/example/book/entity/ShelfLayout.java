package com.example.book.entity;

import lombok.Data;
import java.util.List;

@Data
public class ShelfLayout {
    private Integer version;
    private List<Bookshelf> bookshelves;
    private List<BookPlacement> placements;
}
