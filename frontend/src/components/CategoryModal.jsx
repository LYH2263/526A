import React, { useState, useEffect, useMemo } from 'react';
import request from '../api/request';

const CategoryModal = ({ isOpen, onClose, onSuccess, mode, editingCategory, allCategories }) => {
    const [formData, setFormData] = useState({
        name: '',
        parentId: null,
        sortOrder: 0
    });
    const [errors, setErrors] = useState({});

    const flattenCategories = useMemo(() => {
        const result = [];
        const traverse = (categories, level = 0) => {
            categories.forEach(cat => {
                result.push({ ...cat, _level: level });
                if (cat.children && cat.children.length > 0) {
                    traverse(cat.children, level + 1);
                }
            });
        };
        traverse(allCategories || []);
        return result;
    }, [allCategories]);

    const getExcludedIds = (categoryId) => {
        const excluded = new Set();
        if (!categoryId) return excluded;

        excluded.add(categoryId);
        const findAndMarkDescendants = (categories) => {
            for (const cat of categories) {
                if (excluded.has(cat.id)) {
                    const markAll = (nodes) => {
                        nodes.forEach(n => {
                            excluded.add(n.id);
                            if (n.children && n.children.length > 0) {
                                markAll(n.children);
                            }
                        });
                    };
                    markAll(cat.children || []);
                }
                if (cat.children && cat.children.length > 0) {
                    findAndMarkDescendants(cat.children);
                }
            }
        };
        findAndMarkDescendants(allCategories || []);
        return excluded;
    };

    useEffect(() => {
        if (!isOpen) return;

        if (mode === 'edit' && editingCategory) {
            setFormData({
                name: editingCategory.name || '',
                parentId: editingCategory.parentId || null,
                sortOrder: editingCategory.sortOrder ?? 0
            });
        } else if (mode === 'addChild' && editingCategory?.isParent) {
            setFormData({
                name: '',
                parentId: editingCategory.id,
                sortOrder: 0
            });
        } else {
            setFormData({
                name: '',
                parentId: null,
                sortOrder: 0
            });
        }
        setErrors({});
    }, [isOpen, mode, editingCategory]);

    const validate = () => {
        const newErrors = {};
        if (!formData.name.trim()) {
            newErrors.name = '请输入分类名称';
        } else if (formData.name.length > 100) {
            newErrors.name = '分类名称不能超过100个字符';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            const payload = {
                ...formData,
                name: formData.name.trim(),
                parentId: formData.parentId || null
            };

            if (mode === 'edit' && editingCategory?.id) {
                await request.put('/categories', { ...payload, id: editingCategory.id });
            } else {
                await request.post('/categories', payload);
            }
            onSuccess();
        } catch (error) {
            alert(error.message || '保存失败');
        }
    };

    if (!isOpen) return null;

    const excludedIds = mode === 'edit' && editingCategory?.id
        ? getExcludedIds(editingCategory.id)
        : new Set();

    const getModalTitle = () => {
        switch (mode) {
            case 'edit': return '编辑分类';
            case 'addChild': return `添加子分类 - ${editingCategory?.name || ''}`;
            default: return '新增根分类';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-all p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all scale-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">{getModalTitle()}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            分类名称 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${
                                errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'
                            }`}
                            placeholder="请输入分类名称"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            父分类
                            {mode === 'addChild' && <span className="text-xs text-gray-400 ml-2">(已自动设置)</span>}
                        </label>
                        <select
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            value={formData.parentId || ''}
                            onChange={(e) => setFormData({ ...formData, parentId: e.target.value ? Number(e.target.value) : null })}
                            disabled={mode === 'addChild'}
                        >
                            <option value="">无 (顶级分类)</option>
                            {flattenCategories
                                .filter(cat => !excludedIds.has(cat.id))
                                .map(cat => (
                                    <option key={cat.id} value={cat.id}>
                                        {'　'.repeat(cat._level)}{cat._level > 0 ? '└ ' : ''}{cat.name}
                                    </option>
                                ))}
                        </select>
                        {mode === 'edit' && (
                            <p className="text-gray-400 text-xs mt-1">提示：不能选择当前分类及其子分类作为父分类</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            排序序号
                        </label>
                        <input
                            type="number"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            placeholder="0"
                            value={formData.sortOrder}
                            onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) || 0 })}
                        />
                        <p className="text-gray-400 text-xs mt-1">数值越小越靠前</p>
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

export default CategoryModal;
