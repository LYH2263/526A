package com.example.book.service;

import com.example.book.entity.Book;
import com.example.book.entity.DuplicateGroup;
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
            for (int j = i + 1; j < n; j++) {
                double sim = BookSimilarityUtil.computeBookSimilarity(
                        allBooks.get(i).getTitle(), allBooks.get(i).getAuthor(),
                        allBooks.get(j).getTitle(), allBooks.get(j).getAuthor()
                );
                simMatrix[i][j] = sim;
                simMatrix[j][i] = sim;
            }
        }

        UnionFind uf = new UnionFind(n);
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                if (simMatrix[i][j] >= threshold) {
                    uf.union(i, j);
                }
            }
        }

        Map<Integer, List<Integer>> groupMap = new HashMap<>();
        for (int i = 0; i < n; i++) {
            int root = uf.find(i);
            groupMap.computeIfAbsent(root, k -> new ArrayList<>()).add(i);
        }

        List<DuplicateGroup> groups = new ArrayList<>();
        long groupId = 1;
        for (List<Integer> indices : groupMap.values()) {
            if (indices.size() < 2) continue;

            int refIdx = indices.get(0);
            List<DuplicateGroup.BookDuplicateItem> items = new ArrayList<>();
            double maxSim = 0;

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
                    maxSim = Math.max(maxSim, sim);
                } else {
                    item.setSimilarityToRef(1.0);
                }
                items.add(item);
            }

            DuplicateGroup group = new DuplicateGroup();
            group.setGroupId(groupId++);
            group.setBooks(items);
            group.setMaxSimilarity(Math.round(maxSim * 10000.0) / 10000.0);
            groups.add(group);
        }

        groups.sort((a, b) -> Double.compare(b.getMaxSimilarity(), a.getMaxSimilarity()));
        return groups;
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
            totalFavorites += favoriteMapper.migrateFavorites(dupId, primaryId);

            totalBorrowRecords += borrowRecordMapper.migrateBorrowRecords(dupId, primaryId, primaryBook.getTitle());

            bookReviewMapper.deleteConflictingReviewsBeforeMigrate(dupId, primaryId);
            totalReviews += bookReviewMapper.migrateReviews(dupId, primaryId);

            tagMapper.migrateBookTags(dupId, primaryId);
            tagMapper.deleteBookTagsByBookId(dupId);

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

    private static class UnionFind {
        private final int[] parent;
        private final int[] rank;

        UnionFind(int n) {
            parent = new int[n];
            rank = new int[n];
            for (int i = 0; i < n; i++) {
                parent[i] = i;
                rank[i] = 0;
            }
        }

        int find(int x) {
            if (parent[x] != x) {
                parent[x] = find(parent[x]);
            }
            return parent[x];
        }

        void union(int x, int y) {
            int rx = find(x);
            int ry = find(y);
            if (rx == ry) return;
            if (rank[rx] < rank[ry]) {
                parent[rx] = ry;
            } else if (rank[rx] > rank[ry]) {
                parent[ry] = rx;
            } else {
                parent[ry] = rx;
                rank[rx]++;
            }
        }
    }
}
