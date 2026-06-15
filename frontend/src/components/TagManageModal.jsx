import React, { useState, useEffect, useCallback } from 'react';
import request from '../api/request';

const PALETTE = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#06B6D4',
    '#84CC16', '#E11D48', '#7C3AED', '#0EA5E9', '#D946EF'
];

const TagManageModal = ({ isOpen, onClose, onTagsChanged }) => {
    const [tags, setTags] = useState([]);
    const [editingTag, setEditingTag] = useState(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('#3B82F6');
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#3B82F6');

    const fetchTags = useCallback(async () => {
        try {
            const data = await request.get('/tags');
            setTags(data);
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchTags();
            setEditingTag(null);
            setDeleteConfirmId(null);
            setNewTagName('');
        }
    }, [isOpen, fetchTags]);

    const handleStartEdit = (tag) => {
        setEditingTag(tag.id);
        setEditName(tag.name);
        setEditColor(tag.color);
        setDeleteConfirmId(null);
    };

    const handleCancelEdit = () => {
        setEditingTag(null);
        setEditName('');
        setEditColor('');
    };

    const handleSaveEdit = async (tagId) => {
        if (!editName.trim()) {
            alert('标签名称不能为空');
            return;
        }
        try {
            await request.put('/tags', { id: tagId, name: editName.trim(), color: editColor });
            setEditingTag(null);
            fetchTags();
            if (onTagsChanged) onTagsChanged();
        } catch (e) {
            alert(e.message || '修改失败');
        }
    };

    const handleDelete = async (tagId) => {
        try {
            await request.delete(`/tags/${tagId}`);
            setDeleteConfirmId(null);
            setEditingTag(null);
            fetchTags();
            if (onTagsChanged) onTagsChanged();
        } catch (e) {
            alert(e.message || '删除失败');
        }
    };

    const handleCreateTag = async () => {
        if (!newTagName.trim()) return;
        try {
            await request.post('/tags', { name: newTagName.trim(), color: newTagColor });
            setNewTagName('');
            fetchTags();
            if (onTagsChanged) onTagsChanged();
        } catch (e) {
            alert(e.message || '创建失败');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-all p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all scale-100 overflow-hidden max-h-[85vh] flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-800">标签管理</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 border-b border-gray-100 flex-shrink-0">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                            placeholder="输入新标签名称"
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleCreateTag();
                                }
                            }}
                        />
                        <div className="relative flex items-center">
                            <input
                                type="color"
                                value={newTagColor}
                                onChange={(e) => setNewTagColor(e.target.value)}
                                className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                            />
                        </div>
                        <button
                            onClick={handleCreateTag}
                            disabled={!newTagName.trim()}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-all flex items-center gap-1.5"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            创建
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {tags.length === 0 ? (
                        <div className="text-center py-12">
                            <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            <p className="text-gray-400 text-sm">暂无标签，请在上方创建</p>
                        </div>
                    ) : (
                        tags.map(tag => (
                            <div
                                key={tag.id}
                                className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden"
                            >
                                {editingTag === tag.id ? (
                                    <div className="p-4 space-y-3">
                                        <div className="flex gap-3">
                                            <div className="flex-1">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">标签名称</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveEdit(tag.id);
                                                        if (e.key === 'Escape') handleCancelEdit();
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">颜色</label>
                                                <input
                                                    type="color"
                                                    value={editColor}
                                                    onChange={(e) => setEditColor(e.target.value)}
                                                    className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex gap-1.5 flex-wrap">
                                                {PALETTE.map(c => (
                                                    <button
                                                        key={c}
                                                        type="button"
                                                        className={`w-5 h-5 rounded-full border-2 transition-all ${
                                                            editColor === c ? 'border-gray-800 scale-125' : 'border-transparent hover:scale-110'
                                                        }`}
                                                        style={{ backgroundColor: c }}
                                                        onClick={() => setEditColor(c)}
                                                    />
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="px-3 py-1.5 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-medium transition-colors"
                                                >
                                                    取消
                                                </button>
                                                <button
                                                    onClick={() => handleSaveEdit(tag.id)}
                                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
                                                >
                                                    保存
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-3">
                                            <span
                                                className="w-5 h-5 rounded-full flex-shrink-0 shadow-sm"
                                                style={{ backgroundColor: tag.color }}
                                            />
                                            <div>
                                                <span className="text-sm font-medium text-gray-800">{tag.name}</span>
                                                {tag.bookCount !== undefined && (
                                                    <span className="text-xs text-gray-400 ml-2">{tag.bookCount} 本图书</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleStartEdit(tag)}
                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="编辑"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 00 2 2h11a2 2 0 00 2-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            {deleteConfirmId === tag.id ? (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleDelete(tag.id)}
                                                        className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition-colors"
                                                    >
                                                        确认
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirmId(null)}
                                                        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded text-xs font-medium transition-colors"
                                                    >
                                                        取消
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setDeleteConfirmId(tag.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="删除"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
                    <p className="text-xs text-gray-400 text-center">
                        共 {tags.length} 个标签 · 删除标签将自动解除其与所有图书的关联
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TagManageModal;
