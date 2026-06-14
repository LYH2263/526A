import React, { useState, useEffect, useRef } from 'react';
import request from '../api/request';

const TagSelect = ({ value = [], onChange }) => {
    const [allTags, setAllTags] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        fetchTags();
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchTags = async () => {
        try {
            const data = await request.get('/tags');
            setAllTags(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleRemoveTag = (tagId) => {
        onChange(value.filter(id => id !== tagId));
    };

    const handleSelectTag = (tag) => {
        if (!value.includes(tag.id)) {
            onChange([...value, tag.id]);
        }
        setInputValue('');
        setDropdownOpen(false);
        inputRef.current?.focus();
    };

    const handleCreateAndSelect = async () => {
        const name = inputValue.trim();
        if (!name) return;
        try {
            const newTag = await request.post('/tags/create-if-absent', { name });
            if (!value.includes(newTag.id)) {
                onChange([...value, newTag.id]);
            }
            setInputValue('');
            setDropdownOpen(false);
            fetchTags();
            inputRef.current?.focus();
        } catch (e) {
            console.error(e);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const name = inputValue.trim().toLowerCase();
            if (!name) return;
            const existing = allTags.find(t => t.name === name);
            if (existing) {
                handleSelectTag(existing);
            } else {
                handleCreateAndSelect();
            }
        } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
            handleRemoveTag(value[value.length - 1]);
        }
    };

    const filteredTags = allTags.filter(tag => {
        if (value.includes(tag.id)) return false;
        if (!inputValue.trim()) return true;
        return tag.name.includes(inputValue.trim().toLowerCase());
    });

    const exactMatch = allTags.find(t => t.name === inputValue.trim().toLowerCase());
    const canCreate = inputValue.trim() && !exactMatch;

    const getTagById = (id) => allTags.find(t => t.id === id);

    return (
        <div ref={containerRef} className="relative">
            <div
                className="w-full min-h-[42px] px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl flex flex-wrap items-center gap-1.5 cursor-text focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all"
                onClick={() => inputRef.current?.focus()}
            >
                {value.map(tagId => {
                    const tag = getTagById(tagId);
                    if (!tag) return null;
                    return (
                        <span
                            key={tagId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium text-white transition-all"
                            style={{ backgroundColor: tag.color }}
                        >
                            {tag.name}
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleRemoveTag(tagId); }}
                                className="hover:bg-white/30 rounded-full p-0.5 transition-colors"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </span>
                    );
                })}
                <input
                    ref={inputRef}
                    type="text"
                    className="flex-1 min-w-[80px] bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400 py-0.5"
                    placeholder={value.length === 0 ? '输入标签名，回车创建' : ''}
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setDropdownOpen(true);
                    }}
                    onFocus={() => setDropdownOpen(true)}
                    onKeyDown={handleKeyDown}
                />
            </div>

            {dropdownOpen && (filteredTags.length > 0 || canCreate) && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                    {filteredTags.map(tag => (
                        <div
                            key={tag.id}
                            className="px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center gap-2 text-sm transition-colors"
                            onClick={() => handleSelectTag(tag)}
                        >
                            <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: tag.color }}
                            />
                            <span className="text-gray-700">{tag.name}</span>
                            {tag.bookCount !== undefined && (
                                <span className="text-gray-400 text-xs ml-auto">{tag.bookCount}本</span>
                            )}
                        </div>
                    ))}
                    {canCreate && (
                        <div
                            className="px-3 py-2 cursor-pointer hover:bg-blue-50 flex items-center gap-2 text-sm border-t border-gray-100 transition-colors"
                            onClick={handleCreateAndSelect}
                        >
                            <span className="w-3 h-3 rounded-full flex-shrink-0 bg-blue-400 border-2 border-dashed border-blue-500" />
                            <span className="text-blue-600">
                                创建 "<span className="font-medium">{inputValue.trim()}</span>"
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TagSelect;
