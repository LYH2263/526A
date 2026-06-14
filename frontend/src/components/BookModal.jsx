import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import request from '../api/request';
import TagSelect from './TagSelect';

const flattenTreeForCascader = (tree, level = 0, path = []) => {
    const result = [];
    tree.forEach(node => {
        const currentPath = [...path, node.id];
        result.push({
            id: node.id,
            name: node.name,
            parentId: node.parentId,
            level,
            path: currentPath,
            hasChildren: node.children && node.children.length > 0
        });
        if (node.children && node.children.length > 0) {
            result.push(...flattenTreeForCascader(node.children, level + 1, currentPath));
        }
    });
    return result;
};

const findCategoryPath = (tree, targetId, path = []) => {
    for (const node of tree) {
        const currentPath = [...path, node.id];
        if (node.id === targetId) return currentPath;
        if (node.children && node.children.length > 0) {
            const found = findCategoryPath(node.children, targetId, currentPath);
            if (found) return found;
        }
    }
    return null;
};

const BookModal = ({ isOpen, onClose, onSuccess, bookToEdit, selectedCategory }) => {
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        price: '',
        publishDate: '',
        description: '',
        categoryId: null,
        totalStock: 1,
        availableStock: 1,
        tagIds: []
    });
    const [categoryTree, setCategoryTree] = useState([]);
    const [cascaderOpen, setCascaderOpen] = useState(false);
    const [hoveredLevel, setHoveredLevel] = useState(0);
    const cascaderRef = useRef(null);

    const flatCategories = useMemo(() => flattenTreeForCascader(categoryTree), [categoryTree]);

    const cascaderColumns = useMemo(() => {
        const columns = [];
        const level0 = categoryTree.map(cat => ({
            id: cat.id,
            name: cat.name,
            hasChildren: cat.children && cat.children.length > 0
        }));
        columns.push(level0);

        const getChildrenByParentId = (parentId) => {
            const parent = flatCategories.find(c => c.id === parentId);
            if (!parent || !parent.hasChildren) return [];
            return flatCategories
                .filter(c => c.parentId === parentId)
                .map(c => ({
                    id: c.id,
                    name: c.name,
                    hasChildren: c.hasChildren
                }));
        };

        return { level0, getChildrenByParentId };
    }, [categoryTree, flatCategories]);

    const [selectedPath, setSelectedPath] = useState([]);

    const fetchCategoryTree = async () => {
        try {
            const data = await request.get('/categories/tree');
            setCategoryTree(data.tree || []);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchCategoryTree();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        if (bookToEdit) {
            setFormData({
                ...bookToEdit,
                tagIds: bookToEdit.tags ? bookToEdit.tags.map(t => t.id) : []
            });
            if (bookToEdit.categoryId) {
                const path = findCategoryPath(categoryTree, bookToEdit.categoryId);
                setSelectedPath(path || [bookToEdit.categoryId]);
            } else {
                setSelectedPath([]);
            }
        } else {
            let defaultCategoryId = null;
            if (selectedCategory?.type === 'category') {
                defaultCategoryId = selectedCategory.id;
            }
            setFormData({
                title: '',
                author: '',
                price: '',
                publishDate: '',
                description: '',
                categoryId: defaultCategoryId,
                totalStock: 1,
                availableStock: 1,
                tagIds: []
            });
            if (defaultCategoryId) {
                const path = findCategoryPath(categoryTree, defaultCategoryId);
                setSelectedPath(path || [defaultCategoryId]);
            } else {
                setSelectedPath([]);
            }
        }
    }, [bookToEdit, isOpen, selectedCategory, categoryTree]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (cascaderRef.current && !cascaderRef.current.contains(event.target)) {
                setCascaderOpen(false);
            }
        };
        if (cascaderOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [cascaderOpen]);

    const handleSelectCategory = (category, level) => {
        const newPath = [...selectedPath.slice(0, level), category.id];
        setSelectedPath(newPath);

        if (!category.hasChildren) {
            setFormData({ ...formData, categoryId: category.id });
            setCascaderOpen(false);
        } else {
            setFormData({ ...formData, categoryId: category.id });
            setHoveredLevel(level + 1);
        }
    };

    const handleClearCategory = (e) => {
        e.stopPropagation();
        setSelectedPath([]);
        setFormData({ ...formData, categoryId: null });
    };

    const getSelectedCategoryLabel = useCallback(() => {
        if (selectedPath.length === 0) return '';
        const names = selectedPath.map(id => {
            const found = flatCategories.find(c => c.id === id);
            return found ? found.name : '';
        }).filter(Boolean);
        return names.join(' / ');
    }, [selectedPath, flatCategories]);

    const renderCascaderColumn = (items, level) => {
        if (!items || items.length === 0) return null;

        return (
            <div key={level} className="min-w-[160px] border-r border-gray-100 last:border-r-0 max-h-64 overflow-y-auto">
                {items.map(item => {
                    const isSelected = selectedPath[level] === item.id;
                    const isHovered = hoveredLevel === level + 1 && selectedPath[level] === item.id;
                    return (
                        <div
                            key={item.id}
                            className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between transition-colors ${
                                isSelected || isHovered
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'hover:bg-gray-50 text-gray-700'
                            }`}
                            onClick={() => handleSelectCategory(item, level)}
                            onMouseEnter={() => {
                                if (item.hasChildren) {
                                    setHoveredLevel(level + 1);
                                    const newPath = [...selectedPath.slice(0, level), item.id];
                                    setSelectedPath(newPath);
                                }
                            }}
                        >
                            <span className="truncate pr-2">{item.name}</span>
                            {item.hasChildren && (
                                <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderCascaderPanels = () => {
        const panels = [];
        panels.push(renderCascaderColumn(cascaderColumns.level0, 0));

        for (let i = 0; i < selectedPath.length; i++) {
            const childItems = cascaderColumns.getChildrenByParentId(selectedPath[i]);
            if (childItems.length > 0) {
                panels.push(renderCascaderColumn(childItems, i + 1));
            }
        }

        return panels;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                categoryId: formData.categoryId || null
            };
            if (bookToEdit?.id) {
                await request.put('/books', payload);
            } else {
                await request.post('/books', payload);
            }
            onSuccess();
            onClose();
        } catch (error) {
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-all p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all scale-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">
                        {bookToEdit ? '编辑图书' : '新增图书'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">书名</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            placeholder="填写图书名称"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">分类</label>
                        <div className="relative" ref={cascaderRef}>
                            <div
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer flex items-center justify-between"
                                onClick={() => setCascaderOpen(!cascaderOpen)}
                            >
                                <span className={`${selectedPath.length ? 'text-gray-800' : 'text-gray-400'}`}>
                                    {getSelectedCategoryLabel() || '请选择分类 (可留空)'}
                                </span>
                                <div className="flex items-center gap-1">
                                    {selectedPath.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleClearCategory}
                                            className="p-0.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                    <svg
                                        className={`w-4 h-4 text-gray-400 transition-transform ${cascaderOpen ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {cascaderOpen && (
                                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-10 overflow-hidden flex">
                                    {categoryTree.length === 0 ? (
                                        <div className="px-8 py-8 text-center text-gray-400 text-sm">
                                            <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                            </svg>
                                            暂无分类，请先在左侧创建分类
                                        </div>
                                    ) : (
                                        renderCascaderPanels()
                                    )}
                                </div>
                            )}
                        </div>
                        <p className="text-gray-400 text-xs mt-1">选择层级分类，点击最终分类完成选择；留空则为未分类</p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">标签</label>
                        <TagSelect
                            value={formData.tagIds}
                            onChange={(tagIds) => setFormData({ ...formData, tagIds })}
                        />
                        <p className="text-gray-400 text-xs mt-1">输入标签名回车创建新标签，或从下拉列表选择已有标签</p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">作者</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            placeholder="填写作者名字"
                            value={formData.author}
                            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">价格 (¥)</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                placeholder="0.00"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">出版日期</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                value={formData.publishDate}
                                onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">简介</label>
                        <textarea
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                            rows="3"
                            placeholder="请输入内容简介..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">总库存</label>
                        <input
                            type="number"
                            min="0"
                            required
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            placeholder="请输入总库存数量"
                            value={formData.totalStock}
                            onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setFormData({ ...formData, totalStock: val, availableStock: val });
                            }}
                        />
                        <p className="text-gray-400 text-xs mt-1">设置图书总库存数量，初始可借数量与总库存一致</p>
                    </div>

                    <div className="pt-4 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all transform hover:-translate-y-0.5"
                        >
                            保 存
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BookModal;
