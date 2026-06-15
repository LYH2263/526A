import React, { useState, useEffect, useCallback } from 'react';
import request from '../api/request';
import TagManageModal from './TagManageModal';

const TagFilter = ({ selectedTagIds = [], onTagsChange, semantic = 'OR', onSemanticChange, onTagsManaged }) => {
    const [allTags, setAllTags] = useState([]);
    const [isManageOpen, setIsManageOpen] = useState(false);

    const fetchTags = useCallback(async () => {
        try {
            const data = await request.get('/tags');
            setAllTags(data);
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => {
        fetchTags();
    }, [fetchTags]);

    const handleToggleTag = (tagId) => {
        if (selectedTagIds.includes(tagId)) {
            onTagsChange(selectedTagIds.filter(id => id !== tagId));
        } else {
            onTagsChange([...selectedTagIds, tagId]);
        }
    };

    const handleClearAll = () => {
        onTagsChange([]);
    };

    const handleTagsChanged = () => {
        fetchTags();
        if (onTagsManaged) onTagsManaged();
    };

    if (allTags.length === 0 && !isManageOpen) return null;

    return (
        <>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-700">标签筛选</span>
                        {selectedTagIds.length > 0 && (
                            <span className="text-xs text-gray-400">
                                已选 {selectedTagIds.length} 个
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {selectedTagIds.length > 1 && (
                            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-xs">
                                <button
                                    type="button"
                                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                                        semantic === 'OR'
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                    onClick={() => onSemanticChange('OR')}
                                >
                                    任一(OR)
                                </button>
                                <button
                                    type="button"
                                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                                        semantic === 'AND'
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                    onClick={() => onSemanticChange('AND')}
                                >
                                    全部(AND)
                                </button>
                            </div>
                        )}
                        {selectedTagIds.length > 0 && (
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                            >
                                清除筛选
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setIsManageOpen(true)}
                            className="text-xs text-gray-400 hover:text-blue-500 transition-colors flex items-center gap-1"
                            title="管理标签"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            管理
                        </button>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {allTags.map(tag => {
                        const isSelected = selectedTagIds.includes(tag.id);
                        return (
                            <button
                                key={tag.id}
                                type="button"
                                onClick={() => handleToggleTag(tag.id)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
                                    isSelected
                                        ? 'text-white shadow-md scale-105'
                                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                                }`}
                                style={isSelected ? {
                                    backgroundColor: tag.color,
                                    borderColor: tag.color,
                                    boxShadow: `0 2px 8px ${tag.color}40`
                                } : {}}
                            >
                                <span
                                    className={`w-2 h-2 rounded-full flex-shrink-0 ${isSelected ? 'bg-white/60' : ''}`}
                                    style={!isSelected ? { backgroundColor: tag.color } : {}}
                                />
                                {tag.name}
                                {tag.bookCount !== undefined && (
                                    <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                                        {tag.bookCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <TagManageModal
                isOpen={isManageOpen}
                onClose={() => setIsManageOpen(false)}
                onTagsChanged={handleTagsChanged}
            />
        </>
    );
};

export default TagFilter;
