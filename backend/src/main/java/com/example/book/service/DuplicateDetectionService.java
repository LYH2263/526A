package com.example.book.service;

import com.example.book.entity.Book;
import com.example.book.entity.DuplicateGroup;
import com.example.book.entity.MergePreview;
import com.example.book.entity.MergeResult;
import com.example.book.mapper.*;
import com.example.book.util.BookSimilarityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class DuplicateDetectionService {

    @Autowired
    private BookMapper bookMapper;

    @Autowired
    private FavoriteMapper favoriteMapper;

    @Autowired
    private BorrowRecordMapper borrowRecordMapper;

    @Autowired
    private BookReviewMapper bookReviewMapper;

    @Autowired
    private TagMapper tagMapper;

    @Autowired
    private BookPlacementMapper bookPlacementMapper;

    @Autowired
    private NotificationMapper notificationMapper;

    public List<DuplicateGroup> detectDuplicates(double threshold) {
        List<Book> allBooks = bookMapper.findAll();
        if (allBooks.size() < 2) {
            return Collections.emptyList();
        }

        int n = allBooks.size();
        double[][] simMatrix = new double[n][n];
        for (int i = 0; i < n; i++) {
            simMatrix[i][i] = 1.0;
            for (int j = i + 1; j < n; j++) {
                double sim = BookSimilarityUtil.computeBookSimilarity(
                        allBooks.get(i).getTitle(), allBooks.get(i).getAuthor(),
                        allBooks.get(j).getTitle(), allBooks.get(j).getAuthor()
                );
                simMatrix[i][j] = sim;
                simMatrix[j][i] = sim;
            }
        }

        boolean[] assigned = new boolean[n];
        List<List<Integer>> rawGroups = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            if (assigned[i]) continue;

            List<Integer> group = new ArrayList<>();
            group.add(i);
            assigned[i] = true;

            for (int j = i + 1; j < n; j++) {
                if (assigned[j]) continue;

                boolean allAboveThreshold = true;
                for (int member : group) {
                    if (simMatrix[member][j] < threshold) {
                        allAboveThreshold = false;
                        break;
                    }
                }

                if (allAboveThreshold) {
                    group.add(j);
                    assigned[j] = true;
                }
            }

            if (group.size() >= 2) {
                rawGroups.add(group);
            }
        }

        List<DuplicateGroup> groups = new ArrayList<>();
        long groupId = 1;
        for (List<Integer> indices : rawGroups) {
            int refIdx = indices.get(0);
            List<DuplicateGroup.BookDuplicateItem> items = new ArrayList<>();
            double minSim = 1.0;

            for (int idx : indices) {
                Book b = allBooks.get(idx);
                DuplicateGroup.BookDuplicateItem item = new DuplicateGroup.BookDuplicateItem();
                item.setId(b.getId());
                item.setTitle(b.getTitle());
                item.setAuthor(b.getAuthor());
                item.setPrice(b.getPrice());
                item.setPublishDate(b.getPublishDate());
                item.setDescription(b.getDescription());
                item.setCategoryId(b.getCategoryId());
                item.setCategoryName(b.getCategoryName());
                item.setTotalStock(b.getTotalStock());
                item.setAvailableStock(b.getAvailableStock());

                if (idx != refIdx) {
                    double sim = simMatrix[refIdx][idx];
                    item.setSimilarityToRef(Math.round(sim * 10000.0) / 10000.0);
                } else {
                    item.setSimilarityToRef(1.0);
                }
                items.add(item);
            }

            for (int a = 0; a < indices.size(); a++) {
                for (int b = a + 1; b < indices.size(); b++) {
                    minSim = Math.min(minSim, simMatrix[indices.get(a)][indices.get(b)]);
                }
            }

            DuplicateGroup group = new DuplicateGroup();
            group.setGroupId(groupId++);
            group.setBooks(items);
            group.setMinSimilarity(Math.round(minSim * 10000.0) / 10000.0);
            group.setMaxSimilarity(calculateMaxSim(indices, simMatrix));
            groups.add(group);
        }

        groups.sort((a, b) -> Double.compare(b.getMinSimilarity(), a.getMinSimilarity()));
        return groups;
    }

    private double calculateMaxSim(List<Integer> indices, double[][] simMatrix) {
        double max = 0;
        for (int a = 0; a < indices.size(); a++) {
            for (int b = a + 1; b < indices.size(); b++) {
                max = Math.max(max, simMatrix[indices.get(a)][indices.get(b)]);
            }
        }
        return Math.round(max * 10000.0) / 10000.0;
    }

    public MergePreview previewMerge(MergeResult.MergeRequest request) {
        Long primaryId = request.getPrimaryBookId();
        List<Long> duplicateIds = request.getDuplicateBookIds();

        if (primaryId == null || duplicateIds == null || duplicateIds.isEmpty()) {
            throw new IllegalArgumentException("主记录ID和重复合并列表不能为空");
        }
        if (duplicateIds.contains(primaryId)) {
            throw new IllegalArgumentException("重复合并列表不能包含主记录ID");
        }

        Book primaryBook = bookMapper.findById(primaryId);
        if (primaryBook == null) {
            throw new IllegalArgumentException("主记录不存在");
        }

        MergePreview preview = new MergePreview();
        DuplicateGroup.BookDuplicateItem primaryItem = new DuplicateGroup.BookDuplicateItem();
        primaryItem.setId(primaryBook.getId());
        primaryItem.setTitle(primaryBook.getTitle());
        primaryItem.setAuthor(primaryBook.getAuthor());
        primaryItem.setPrice(primaryBook.getPrice());
        primaryItem.setPublishDate(primaryBook.getPublishDate());
        primaryItem.setDescription(primaryBook.getDescription());
        primaryItem.setCategoryId(primaryBook.getCategoryId());
        primaryItem.setCategoryName(primaryBook.getCategoryName());
        primaryItem.setTotalStock(primaryBook.getTotalStock());
        primaryItem.setAvailableStock(primaryBook.getAvailableStock());
        preview.setPrimaryBook(primaryItem);

        int totalFavorites = 0;
        int totalBorrowRecords = 0;
        int totalReviews = 0;
        int totalBookTags = 0;
        int totalPlacements = 0;
        int totalNotifications = 0;
        int deletedFavorites = 0;
        int deletedReviews = 0;

        for (Long dupId : duplicateIds) {
            Book dupBook = bookMapper.findById(dupId);
            if (dupBook == null) {
                throw new IllegalArgumentException("重复记录ID=" + dupId + "不存在");
            }

            int dupFavCount = favoriteMapper.countByBookId(dupId);
            int dupReviewCount = bookReviewMapper.countReviews(dupId);
            int dupBorrowCount = borrowRecordMapper.countByBookId(dupId);
            int dupPlacementCount = bookPlacementMapper.countByBookId(dupId);
            int dupTagCount = tagMapper.countTagsByBookId(dupId);
            int dupNotifCount = notificationMapper.countByBookId(dupId);

            totalFavorites += dupFavCount;
            totalBorrowRecords += dupBorrowCount;
            totalReviews += dupReviewCount;
            totalBookTags += dupTagCount;
            totalPlacements += dupPlacementCount;
            totalNotifications += dupNotifCount;
        }

        preview.setTotalFavorites(totalFavorites);
        preview.setTotalBorrowRecords(totalBorrowRecords);
        preview.setTotalReviews(totalReviews);
        preview.setTotalBookTags(totalBookTags);
        preview.setTotalPlacements(totalPlacements);
        preview.setTotalNotifications(totalNotifications);
        preview.setDeletedFavorites(deletedFavorites);
        preview.setDeletedReviews(deletedReviews);
        preview.setMergedCount(duplicateIds.size());

        return preview;
    }

    @Transactional
    public MergeResult mergeDuplicates(MergeResult.MergeRequest request) {
        Long primaryId = request.getPrimaryBookId();
        List<Long> duplicateIds = request.getDuplicateBookIds();

        if (primaryId == null || duplicateIds == null || duplicateIds.isEmpty()) {
            throw new IllegalArgumentException("主记录ID和重复合并列表不能为空");
        }
        if (duplicateIds.contains(primaryId)) {
            throw new IllegalArgumentException("重复合并列表不能包含主记录ID");
        }

        Book primaryBook = bookMapper.findById(primaryId);
        if (primaryBook == null) {
            throw new IllegalArgumentException("主记录不存在");
        }

        for (Long dupId : duplicateIds) {
            Book dupBook = bookMapper.findById(dupId);
            if (dupBook == null) {
                throw new IllegalArgumentException("重复记录ID=" + dupId + "不存在");
            }
        }

        MergeResult result = new MergeResult();
        result.setPrimaryBookId(primaryId);
        result.setMergedCount(duplicateIds.size());
        int totalFavorites = 0;
        int totalBorrowRecords = 0;
        int totalReviews = 0;
        int totalBookTags = 0;
        int totalPlacements = 0;

        for (Long dupId : duplicateIds) {
            Book dupBook = bookMapper.findById(dupId);

            favoriteMapper.deleteConflictingBeforeMigrate(dupId, primaryId);
            int migratedFav = favoriteMapper.migrateFavorites(dupId, primaryId);
            totalFavorites += migratedFav;

            int migratedBorrow = borrowRecordMapper.migrateBorrowRecords(dupId, primaryId, primaryBook.getTitle());
            totalBorrowRecords += migratedBorrow;

            bookReviewMapper.deleteConflictingReviewsBeforeMigrate(dupId, primaryId);
            int migratedReview = bookReviewMapper.migrateReviews(dupId, primaryId);
            totalReviews += migratedReview;

            tagMapper.migrateBookTags(dupId, primaryId);
            tagMapper.deleteBookTagsByBookId(dupId);
            totalBookTags = -1;

            totalPlacements += bookPlacementMapper.countByBookId(dupId);
            bookPlacementMapper.deleteByBookId(dupId);

            notificationMapper.migrateNotifications(dupId, primaryId, primaryBook.getTitle());

            bookMapper.deleteById(dupId);
        }

        bookMapper.updateRatingStats(primaryId);

        result.setMigratedFavorites(totalFavorites);
        result.setMigratedBorrowRecords(totalBorrowRecords);
        result.setMigratedReviews(totalReviews);
        result.setMigratedBookTags(totalBookTags);
        result.setMigratedPlacements(totalPlacements);
        return result;
    }
}
