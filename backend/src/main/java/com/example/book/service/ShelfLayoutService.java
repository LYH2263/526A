package com.example.book.service;

import com.example.book.entity.*;
import com.example.book.mapper.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ShelfLayoutService {

    @Autowired
    private BookshelfMapper bookshelfMapper;

    @Autowired
    private ShelfLayerMapper shelfLayerMapper;

    @Autowired
    private BookPlacementMapper bookPlacementMapper;

    @Autowired
    private BookMapper bookMapper;

    public ShelfLayout loadLayout() {
        ShelfLayout layout = new ShelfLayout();
        layout.setVersion(1);

        List<Bookshelf> bookshelves = bookshelfMapper.findAll();
        for (Bookshelf shelf : bookshelves) {
            List<ShelfLayer> layers = shelfLayerMapper.findByBookshelfId(shelf.getId());
            for (ShelfLayer layer : layers) {
                List<BookPlacement> placements = bookPlacementMapper.findByLayerId(layer.getId());
                for (BookPlacement placement : placements) {
                    Book book = bookMapper.findById(placement.getBookId());
                    placement.setBook(book);
                }
                layer.setPlacements(placements);
                layer.setCurrentCount(placements.size());
            }
            shelf.setLayers(layers);
        }
        layout.setBookshelves(bookshelves);
        layout.setPlacements(bookPlacementMapper.findAll());

        return layout;
    }

    @Transactional
    public void saveLayout(ShelfLayout layout) {
        bookPlacementMapper.deleteAll();

        if (layout.getBookshelves() != null) {
            for (Bookshelf shelf : layout.getBookshelves()) {
                if (shelf.getId() == null) {
                    bookshelfMapper.insert(shelf);
                } else {
                    bookshelfMapper.update(shelf);
                }

                if (shelf.getLayers() != null) {
                    for (ShelfLayer layer : shelf.getLayers()) {
                        layer.setBookshelfId(shelf.getId());
                        if (layer.getId() == null) {
                            shelfLayerMapper.insert(layer);
                        } else {
                            shelfLayerMapper.update(layer);
                        }

                        if (layer.getPlacements() != null) {
                            for (BookPlacement placement : layer.getPlacements()) {
                                placement.setBookshelfId(shelf.getId());
                                placement.setLayerId(layer.getId());
                                bookPlacementMapper.insert(placement);
                            }
                        }
                    }
                }
            }
        }
    }

    public Map<String, Object> checkCapacity(Long layerId, int addCount) {
        Map<String, Object> result = new HashMap<>();
        ShelfLayer layer = shelfLayerMapper.findById(layerId);
        if (layer == null) {
            result.put("valid", false);
            result.put("message", "格层不存在");
            return result;
        }

        int currentCount = shelfLayerMapper.countByLayerId(layerId);
        boolean valid = (currentCount + addCount) <= layer.getCapacity();

        result.put("valid", valid);
        result.put("capacity", layer.getCapacity());
        result.put("currentCount", currentCount);
        result.put("remaining", layer.getCapacity() - currentCount);
        result.put("message", valid ? "容量充足" : "格层容量不足，当前：" + currentCount + "/" + layer.getCapacity());

        return result;
    }

    @Transactional
    public Bookshelf createBookshelf(Bookshelf shelf) {
        if (shelf.getPositionX() == null) shelf.setPositionX(50);
        if (shelf.getPositionY() == null) shelf.setPositionY(50);
        if (shelf.getWidth() == null) shelf.setWidth(400);
        if (shelf.getSortOrder() == null) shelf.setSortOrder(0);
        bookshelfMapper.insert(shelf);

        int defaultLayers = 5;
        for (int i = 0; i < defaultLayers; i++) {
            ShelfLayer layer = new ShelfLayer();
            layer.setBookshelfId(shelf.getId());
            layer.setLayerIndex(i);
            layer.setCapacity(10);
            layer.setHeight(60);
            shelfLayerMapper.insert(layer);
        }

        return shelf;
    }

    @Transactional
    public void deleteBookshelf(Long id) {
        bookPlacementMapper.deleteByBookshelfId(id);
        shelfLayerMapper.deleteByBookshelfId(id);
        bookshelfMapper.deleteById(id);
    }

    public Bookshelf updateBookshelf(Bookshelf shelf) {
        bookshelfMapper.update(shelf);
        return shelf;
    }

    @Transactional
    public ShelfLayer addLayer(Long bookshelfId) {
        List<ShelfLayer> existingLayers = shelfLayerMapper.findByBookshelfId(bookshelfId);
        int nextIndex = existingLayers.size();

        ShelfLayer layer = new ShelfLayer();
        layer.setBookshelfId(bookshelfId);
        layer.setLayerIndex(nextIndex);
        layer.setCapacity(10);
        layer.setHeight(60);
        shelfLayerMapper.insert(layer);

        return layer;
    }

    @Transactional
    public void removeLayer(Long layerId) {
        bookPlacementMapper.deleteByLayerId(layerId);
        shelfLayerMapper.deleteById(layerId);
    }

    public ShelfLayer updateLayer(ShelfLayer layer) {
        shelfLayerMapper.update(layer);
        return layer;
    }

    @Transactional
    public Map<String, Object> placeBook(Long bookId, Long layerId, Integer positionIndex) {
        BookPlacement existing = bookPlacementMapper.findByBookId(bookId);
        boolean isSameLayer = existing != null && existing.getLayerId().equals(layerId);
        
        int addCount = 1;
        if (isSameLayer) {
            addCount = 0;
        } else if (existing != null) {
            addCount = 1;
        }
        
        Map<String, Object> result = checkCapacity(layerId, addCount);
        if (!(Boolean) result.get("valid")) {
            return result;
        }

        if (existing != null) {
            bookPlacementMapper.deleteById(existing.getId());
        }

        List<BookPlacement> placements = bookPlacementMapper.findByLayerId(layerId);
        int insertPos = positionIndex != null ? positionIndex : placements.size();
        insertPos = Math.min(insertPos, placements.size());

        for (BookPlacement p : placements) {
            if (p.getPositionIndex() >= insertPos) {
                p.setPositionIndex(p.getPositionIndex() + 1);
                bookPlacementMapper.update(p);
            }
        }

        ShelfLayer layer = shelfLayerMapper.findById(layerId);
        BookPlacement placement = new BookPlacement();
        placement.setBookId(bookId);
        placement.setBookshelfId(layer.getBookshelfId());
        placement.setLayerId(layerId);
        placement.setPositionIndex(insertPos);
        bookPlacementMapper.insert(placement);

        result.put("valid", true);
        result.put("message", "放置成功");
        return result;
    }

    @Transactional
    public void removeBookFromShelf(Long bookId) {
        BookPlacement existing = bookPlacementMapper.findByBookId(bookId);
        if (existing != null) {
            bookPlacementMapper.deleteById(existing.getId());
        }
    }

    @Transactional
    public Map<String, Object> batchMoveBooks(List<Long> bookIds, Long targetLayerId, Integer startPosition) {
        int booksAlreadyInTargetLayer = 0;
        Set<Long> sourceLayerIds = new HashSet<>();
        
        for (Long bookId : bookIds) {
            BookPlacement existing = bookPlacementMapper.findByBookId(bookId);
            if (existing != null) {
                if (existing.getLayerId().equals(targetLayerId)) {
                    booksAlreadyInTargetLayer++;
                } else {
                    sourceLayerIds.add(existing.getLayerId());
                }
            }
        }
        
        int netAddCount = bookIds.size() - booksAlreadyInTargetLayer;
        Map<String, Object> result = checkCapacity(targetLayerId, netAddCount);
        if (!(Boolean) result.get("valid")) {
            return result;
        }

        ShelfLayer targetLayer = shelfLayerMapper.findById(targetLayerId);
        if (targetLayer == null) {
            result.put("valid", false);
            result.put("message", "目标格层不存在");
            return result;
        }

        List<BookPlacement> targetPlacements = bookPlacementMapper.findByLayerId(targetLayerId);
        int insertPos = startPosition != null ? startPosition : targetPlacements.size();

        for (Long bookId : bookIds) {
            BookPlacement existing = bookPlacementMapper.findByBookId(bookId);
            if (existing != null) {
                bookPlacementMapper.deleteById(existing.getId());
            }
        }

        for (Long sourceLayerId : sourceLayerIds) {
            if (!sourceLayerId.equals(targetLayerId)) {
                List<BookPlacement> sourcePlacements = bookPlacementMapper.findByLayerId(sourceLayerId);
                for (int i = 0; i < sourcePlacements.size(); i++) {
                    sourcePlacements.get(i).setPositionIndex(i);
                    bookPlacementMapper.update(sourcePlacements.get(i));
                }
            }
        }

        List<BookPlacement> currentTargetPlacements = bookPlacementMapper.findByLayerId(targetLayerId);
        for (BookPlacement p : currentTargetPlacements) {
            if (p.getPositionIndex() >= insertPos) {
                p.setPositionIndex(p.getPositionIndex() + bookIds.size());
                bookPlacementMapper.update(p);
            }
        }

        for (int i = 0; i < bookIds.size(); i++) {
            BookPlacement placement = new BookPlacement();
            placement.setBookId(bookIds.get(i));
            placement.setBookshelfId(targetLayer.getBookshelfId());
            placement.setLayerId(targetLayerId);
            placement.setPositionIndex(insertPos + i);
            bookPlacementMapper.insert(placement);
        }

        result.put("valid", true);
        result.put("message", "批量移动成功");
        return result;
    }

    public List<Book> getUnplacedBooks() {
        List<Book> allBooks = bookMapper.findAll();
        List<BookPlacement> placements = bookPlacementMapper.findAll();
        Set<Long> placedBookIds = placements.stream()
                .map(BookPlacement::getBookId)
                .collect(Collectors.toSet());

        return allBooks.stream()
                .filter(book -> !placedBookIds.contains(book.getId()))
                .collect(Collectors.toList());
    }
}
