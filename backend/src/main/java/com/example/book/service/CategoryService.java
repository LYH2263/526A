package com.example.book.service;

import com.example.book.entity.Category;
import com.example.book.mapper.CategoryMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class CategoryService {

    @Autowired
    private CategoryMapper categoryMapper;

    public List<Category> findAll() {
        return categoryMapper.findAll();
    }

    public Category findById(Long id) {
        return categoryMapper.findById(id);
    }

    public List<Category> getCategoryTree() {
        List<Category> allCategories = categoryMapper.findAll();
        Map<Long, Integer> bookCountMap = calculateBookCounts(allCategories);
        List<Category> roots = buildTree(allCategories, null);
        applyBookCounts(roots, bookCountMap);
        return roots;
    }

    private List<Category> buildTree(List<Category> allCategories, Long parentId) {
        return allCategories.stream()
                .filter(cat -> Objects.equals(cat.getParentId(), parentId))
                .map(cat -> {
                    cat.setChildren(buildTree(allCategories, cat.getId()));
                    return cat;
                })
                .sorted(Comparator.comparing(Category::getSortOrder, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(Category::getId))
                .collect(Collectors.toList());
    }

    private Map<Long, Integer> calculateBookCounts(List<Category> allCategories) {
        Map<Long, Integer> directCounts = new HashMap<>();
        for (Category cat : allCategories) {
            directCounts.put(cat.getId(), categoryMapper.countBooksInCategory(cat.getId()));
        }

        Map<Long, Integer> totalCounts = new HashMap<>();
        Set<Long> visited = new HashSet<>();
        for (Category cat : allCategories) {
            calculateTotalCount(cat.getId(), allCategories, directCounts, totalCounts, visited);
        }
        return totalCounts;
    }

    private int calculateTotalCount(Long categoryId, List<Category> allCategories,
                                    Map<Long, Integer> directCounts, Map<Long, Integer> totalCounts,
                                    Set<Long> visited) {
        if (totalCounts.containsKey(categoryId)) {
            return totalCounts.get(categoryId);
        }
        if (!visited.add(categoryId)) {
            return 0;
        }

        int count = directCounts.getOrDefault(categoryId, 0);

        List<Long> childIds = allCategories.stream()
                .filter(cat -> Objects.equals(cat.getParentId(), categoryId))
                .map(Category::getId)
                .collect(Collectors.toList());

        for (Long childId : childIds) {
            count += calculateTotalCount(childId, allCategories, directCounts, totalCounts, visited);
        }

        totalCounts.put(categoryId, count);
        return count;
    }

    private void applyBookCounts(List<Category> tree, Map<Long, Integer> bookCountMap) {
        for (Category cat : tree) {
            cat.setBookCount(bookCountMap.getOrDefault(cat.getId(), 0));
            if (cat.getChildren() != null && !cat.getChildren().isEmpty()) {
                applyBookCounts(cat.getChildren(), bookCountMap);
            }
        }
    }

    public List<Long> getCategoryAndDescendantIds(Long categoryId) {
        List<Long> ids = new ArrayList<>();
        ids.add(categoryId);
        List<Long> descendants = categoryMapper.findAllDescendantIds(categoryId);
        if (descendants != null) {
            ids.addAll(descendants);
        }
        return ids;
    }

    public int countUncategorizedBooks() {
        return categoryMapper.countBooksInCategory(null);
    }

    @Transactional
    public void save(Category category) {
        if (category.getId() == null) {
            if (category.getSortOrder() == null) {
                category.setSortOrder(0);
            }
            categoryMapper.insert(category);
        } else {
            if (category.getParentId() != null) {
                checkForCycle(category.getId(), category.getParentId());
            }
            categoryMapper.update(category);
        }
    }

    private void checkForCycle(Long categoryId, Long newParentId) {
        if (Objects.equals(categoryId, newParentId)) {
            throw new RuntimeException("不能将分类设置为自己的父分类");
        }
        List<Long> descendantIds = categoryMapper.findAllDescendantIds(categoryId);
        if (descendantIds != null && descendantIds.contains(newParentId)) {
            throw new RuntimeException("操作会导致循环父子关系，不能将分类移动到其子分类下");
        }
    }

    @Transactional
    public void deleteById(Long id) {
        int childCount = categoryMapper.countChildren(id);
        if (childCount > 0) {
            throw new RuntimeException("该分类下存在 " + childCount + " 个子分类，无法删除");
        }
        int bookCount = categoryMapper.countBooksInCategory(id);
        if (bookCount > 0) {
            throw new RuntimeException("该分类下存在 " + bookCount + " 本图书，无法删除");
        }
        categoryMapper.deleteById(id);
    }
}
