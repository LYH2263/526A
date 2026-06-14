package com.example.book.service;

import com.example.book.entity.Tag;
import com.example.book.mapper.TagMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class TagService {

    @Autowired
    private TagMapper tagMapper;

    private static final String[] PALETTE = {
        "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6",
        "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#06B6D4",
        "#84CC16", "#E11D48", "#7C3AED", "#0EA5E9", "#D946EF"
    };

    public List<Tag> findAll() {
        return tagMapper.findAll();
    }

    public Tag findById(Long id) {
        return tagMapper.findById(id);
    }

    public Tag findByName(String name) {
        return tagMapper.findByName(name);
    }

    private String generateColor(String name) {
        int hash = 0;
        for (int i = 0; i < name.length(); i++) {
            hash = name.charAt(i) + ((hash << 5) - hash);
        }
        int index = Math.abs(hash) % PALETTE.length;
        return PALETTE[index];
    }

    @Transactional
    public Tag save(Tag tag) {
        String normalizedName = normalizeName(tag.getName());
        tag.setName(normalizedName);

        if (tag.getId() == null) {
            Tag existing = tagMapper.findByName(normalizedName);
            if (existing != null) {
                throw new IllegalArgumentException("标签 \"" + normalizedName + "\" 已存在");
            }
            if (tag.getColor() == null || tag.getColor().isEmpty()) {
                tag.setColor(generateColor(normalizedName));
            }
            tagMapper.insert(tag);
        } else {
            Tag existing = tagMapper.findByName(normalizedName);
            if (existing != null && !existing.getId().equals(tag.getId())) {
                throw new IllegalArgumentException("标签 \"" + normalizedName + "\" 已存在");
            }
            tagMapper.update(tag);
        }
        return tag;
    }

    @Transactional
    public Tag createIfAbsent(String name) {
        String normalizedName = normalizeName(name);
        Tag existing = tagMapper.findByName(normalizedName);
        if (existing != null) {
            return existing;
        }
        Tag tag = new Tag();
        tag.setName(normalizedName);
        tag.setColor(generateColor(normalizedName));
        tagMapper.insert(tag);
        return tag;
    }

    @Transactional
    public void deleteById(Long id) {
        tagMapper.deleteBookTagsByTagId(id);
        tagMapper.deleteById(id);
    }

    @Transactional
    public void assignTagToBook(Long bookId, Long tagId) {
        tagMapper.insertBookTag(bookId, tagId);
    }

    @Transactional
    public void removeTagFromBook(Long bookId, Long tagId) {
        tagMapper.deleteBookTag(bookId, tagId);
    }

    @Transactional
    public void syncBookTags(Long bookId, List<Long> tagIds) {
        tagMapper.deleteBookTagsByBookId(bookId);
        if (tagIds != null) {
            for (Long tagId : tagIds) {
                tagMapper.insertBookTag(bookId, tagId);
            }
        }
    }

    public List<Tag> findByBookId(Long bookId) {
        return tagMapper.findByBookId(bookId);
    }

    public List<Long> findBookIdsByTagIds(List<Long> tagIds, String semantic) {
        if (tagIds == null || tagIds.isEmpty()) {
            return List.of();
        }
        if ("AND".equalsIgnoreCase(semantic)) {
            return tagMapper.findBookIdsByTagIdsAnd(tagIds);
        }
        return tagMapper.findBookIdsByTagIdsOr(tagIds);
    }

    private String normalizeName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("标签名称不能为空");
        }
        return name.trim().toLowerCase();
    }
}
