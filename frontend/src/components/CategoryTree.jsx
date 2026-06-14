import React, { useState, useEffect } from 'react';
import request from '../api/request';
import CategoryModal from './CategoryModal';

const CategoryTree = ({ selectedCategory, onSelectCategory, onTreeChange }) => {
    const [treeData, setTreeData] = useState([]);
    const [uncategorizedCount, setUncategorizedCount] = useState(0);
    const [expandedKeys, setExpandedKeys] = useState(new Set(['uncategorized']));
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [modalMode, setModalMode] = useState('add');

    const fetchCategoryTree = async () => {
        try {
            const data = await request.get('/categories/tree');
            setTreeData(data.tree || []);
            setUncategorizedCount(data.uncategorizedCount || 0);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchCategoryTree();
    }, []);

    useEffect(() => {
        if (onTreeChange) {
            onTreeChange();
        }
    }, [treeData, uncategorizedCount]);

    const toggleExpand = (key) => {
        const newExpanded = new Set(expandedKeys);
        if (newExpanded.has(String(key))) {
            newExpanded.delete(String(key));
        } else {
            newExpanded.add(String(key));
        }
        setExpandedKeys(newExpanded);
    };

    const handleSelectAll = () => {
        onSelectCategory({ type: 'all' });
    };

    const handleSelectUncategorized = () => {
        onSelectCategory({ type: 'uncategorized' });
    };

    const handleSelectCategory = (category) => {
        onSelectCategory({ type: 'category', id: category.id, name: category.name });
    };

    const handleAddRootCategory = () => {
        setEditingCategory(null);
        setModalMode('add');
        setIsCategoryModalOpen(true);
    };

    const handleAddChild = (e, parent) => {
        e.stopPropagation();
        setEditingCategory({ ...parent, isParent: true });
        setModalMode('addChild');
        setIsCategoryModalOpen(true);
    };

    const handleEdit = (e, category) => {
        e.stopPropagation();
        setEditingCategory(category);
        setModalMode('edit');
        setIsCategoryModalOpen(true);
    };

    const handleDelete = async (e, category) => {
        e.stopPropagation();
        if (!window.confirm(`确定要删除分类 "${category.name}" 吗？`)) return;
        try {
            await request.delete(`/categories/${category.id}`);
            if (selectedCategory?.id === category.id) {
                onSelectCategory({ type: 'all' });
            }
            fetchCategoryTree();
        } catch (error) {
            alert(error.message || '删除失败');
        }
    };

    const expandParentOf = (categories, targetId, path = []) => {
        for (const cat of categories) {
            if (cat.id === targetId) {
                const newExpanded = new Set(expandedKeys);
                path.forEach(id => newExpanded.add(String(id)));
                setExpandedKeys(newExpanded);
                return true;
            }
            if (cat.children && cat.children.length > 0) {
                if (expandParentOf(cat.children, targetId, [...path, cat.id])) {
                    return true;
                }
            }
        }
        return false;
    };

    useEffect(() => {
        if (selectedCategory?.type === 'category' && selectedCategory.id) {
            expandParentOf(treeData, selectedCategory.id);
        }
    }, [selectedCategory, treeData]);

    const renderCategoryNode = (category, level = 0) => {
        const hasChildren = category.children && category.children.length > 0;
        const isExpanded = expandedKeys.has(String(category.id));
        const isSelected = selectedCategory?.type === 'category' && selectedCategory.id === category.id;

        return (
            <div key={category.id}>
                <div
                    className={`flex items-center pr-2 py-2 cursor-pointer rounded-lg transition-all group ${
                        isSelected
                            ? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-500'
                            : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                    style={{ paddingLeft: `${level * 16 + 12}px` }}
                    onClick={() => handleSelectCategory(category)}
                >
                    {hasChildren ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(category.id);
                            }}
                            className="w-5 h-5 flex items-center justify-center mr-1 text-gray-400 hover:text-gray-600"
                        >
                            <svg
                                className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    ) : (
                        <div className="w-5 h-5 mr-1" />
                    )}

                    <svg className={`w-4 h-4 mr-2 ${isSelected ? 'text-blue-500' : 'text-amber-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>

                    <span className="flex-1 truncate text-sm">{category.name}</span>

                    <span className={`text-xs px-2 py-0.5 rounded-full mr-2 ${
                        isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                        {category.bookCount || 0}
                    </span>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                        <button
                            onClick={(e) => handleAddChild(e, category)}
                            className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                            title="添加子分类"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                        <button
                            onClick={(e) => handleEdit(e, category)}
                            className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                            title="编辑"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button
                            onClick={(e) => handleDelete(e, category)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="删除"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>

                {hasChildren && isExpanded && (
                    <div>
                        {category.children.map(child => renderCategoryNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    const totalBookCount = treeData.reduce((sum, cat) => sum + (cat.bookCount || 0), 0) + uncategorizedCount;
    const isAllSelected = selectedCategory?.type === 'all';
    const isUncategorizedSelected = selectedCategory?.type === 'uncategorized';

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
                <div className="flex justify-between items-center mb-1">
                    <h2 className="text-xl font-extrabold text-gray-800 tracking-tight">分类导航</h2>
                    <button
                        onClick={handleAddRootCategory}
                        className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                        title="新增根分类"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>
                <p className="text-gray-500 text-xs">管理图书分类层级</p>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
                <div
                    className={`flex items-center px-4 py-2 cursor-pointer rounded-lg transition-all mx-2 ${
                        isAllSelected
                            ? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-500'
                            : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                    onClick={handleSelectAll}
                >
                    <svg className={`w-4 h-4 mr-2 ${isAllSelected ? 'text-blue-500' : 'text-purple-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="flex-1 text-sm">全部图书</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isAllSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                        {totalBookCount}
                    </span>
                </div>

                <div
                    className={`flex items-center px-4 py-2 cursor-pointer rounded-lg transition-all mx-2 ${
                        isUncategorizedSelected
                            ? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-500'
                            : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                    onClick={handleSelectUncategorized}
                >
                    <svg className={`w-4 h-4 mr-2 ${isUncategorizedSelected ? 'text-blue-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <span className="flex-1 text-sm">未分类</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isUncategorizedSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                        {uncategorizedCount}
                    </span>
                </div>

                <div className="my-2 mx-4 border-t border-gray-100" />

                {treeData.length === 0 && (
                    <div className="text-center py-8 px-4">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 text-sm">暂无分类</p>
                        <button
                            onClick={handleAddRootCategory}
                            className="mt-3 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                        >
                            + 创建第一个分类
                        </button>
                    </div>
                )}

                {treeData.map(category => renderCategoryNode(category, 0))}
            </div>

            <CategoryModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                onSuccess={() => {
                    setIsCategoryModalOpen(false);
                    fetchCategoryTree();
                }}
                mode={modalMode}
                editingCategory={editingCategory}
                allCategories={treeData}
            />
        </div>
    );
};

export default CategoryTree;
