import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import request from '../api/request';
import TagSelect from './TagSelect';
import EditConflictModal from './EditConflictModal';
import collaborativeEdit, { submitBookWithVersion } from '../api/collaborativeEdit';

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

const FIELD_LABELS = {
    title: '书名',
    author: '作者',
    price: '价格',
    publishDate: '出版日期',
    description: '简介',
    categoryId: '分类',
    totalStock: '总库存',
    warnThreshold: '预警阈值'
};

const BookModal = ({ isOpen, onClose, onSuccess, bookToEdit, selectedCategory, currentUser }) => {
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        price: '',
        publishDate: '',
        description: '',
        categoryId: null,
        totalStock: 1,
        availableStock: 1,
        warnThreshold: 0,
        tagIds: [],
        version: 0
    });
    const [categoryTree, setCategoryTree] = useState([]);
    const [cascaderOpen, setCascaderOpen] = useState(false);
    const [hoveredLevel, setHoveredLevel] = useState(0);
    const cascaderRef = useRef(null);

    const [onlineEditors, setOnlineEditors] = useState([]);
    const [fieldStates, setFieldStates] = useState({});
    const [wsConnected, setWsConnected] = useState(false);
    const [showConflict, setShowConflict] = useState(false);
    const [conflictData, setConflictData] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingSession, setEditingSession] = useState(null);

    const wsListenersRef = useRef([]);

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

    const cleanupWsListeners = useCallback(() => {
        wsListenersRef.current.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        wsListenersRef.current = [];
    }, []);

    const setupWsListeners = useCallback(() => {
        cleanupWsListeners();

        wsListenersRef.current.push(
            collaborativeEdit.on('connected', () => {
                setWsConnected(true);
            })
        );

        wsListenersRef.current.push(
            collaborativeEdit.on('disconnected', () => {
                setWsConnected(false);
            })
        );

        wsListenersRef.current.push(
            collaborativeEdit.on('editorJoined', ({ onlineEditors }) => {
                setOnlineEditors([...onlineEditors]);
            })
        );

        wsListenersRef.current.push(
            collaborativeEdit.on('editorLeft', ({ onlineEditors }) => {
                setOnlineEditors([...onlineEditors]);
            })
        );

        wsListenersRef.current.push(
            collaborativeEdit.on('onlineEditorsUpdate', (editors) => {
                setOnlineEditors([...editors]);
            })
        );

        wsListenersRef.current.push(
            collaborativeEdit.on('fieldEditStart', (fieldState) => {
                setFieldStates(prev => ({
                    ...prev,
                    [fieldState.fieldName]: fieldState
                }));
            })
        );

        wsListenersRef.current.push(
            collaborativeEdit.on('fieldEditEnd', ({ fieldName }) => {
                setFieldStates(prev => {
                    const newStates = { ...prev };
                    delete newStates[fieldName];
                    return newStates;
                });
            })
        );

        wsListenersRef.current.push(
            collaborativeEdit.on('fieldStatesUpdate', (states) => {
                setFieldStates({ ...states });
            })
        );

        wsListenersRef.current.push(
            collaborativeEdit.on('bookUpdated', (updatedBook) => {
                if (updatedBook && updatedBook.version > formData.version) {
                    setFormData(prev => ({
                        ...prev,
                        version: updatedBook.version
                    }));
                }
            })
        );
    }, [cleanupWsListeners, formData.version]);

    const joinCollaborativeEdit = useCallback(async (bookId) => {
        if (!bookId || !currentUser) return;

        try {
            const result = await collaborativeEdit.joinEdit(bookId, currentUser.id, currentUser.username);
            setEditingSession(result);
            setOnlineEditors(result.onlineEditors || []);
            setFieldStates(collaborativeEdit.getFieldStates());
            setupWsListeners();
        } catch (error) {
            console.error('Failed to join collaborative edit:', error);
        }
    }, [currentUser, setupWsListeners]);

    const leaveCollaborativeEdit = useCallback(async () => {
        cleanupWsListeners();
        await collaborativeEdit.leaveEdit();
        setOnlineEditors([]);
        setFieldStates({});
        setWsConnected(false);
        setEditingSession(null);
    }, [cleanupWsListeners]);

    const handleFieldFocus = useCallback((fieldName) => {
        if (!bookToEdit?.id || !currentUser) return;
        collaborativeEdit.sendFieldEdit(fieldName);
    }, [bookToEdit?.id, currentUser]);

    const handleFieldBlur = useCallback((fieldName) => {
        if (!bookToEdit?.id || !currentUser) return;
        collaborativeEdit.sendFieldEditEnd(fieldName);
    }, [bookToEdit?.id, currentUser]);

    const isFieldLocked = useCallback((fieldName) => {
        const state = fieldStates[fieldName];
        return state && state.editorUserId !== currentUser?.id;
    }, [fieldStates, currentUser?.id]);

    const getFieldLockInfo = useCallback((fieldName) => {
        return fieldStates[fieldName];
    }, [fieldStates]);

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
                tagIds: bookToEdit.tags ? bookToEdit.tags.map(t => t.id) : [],
                version: bookToEdit.version || 0
            });
            if (bookToEdit.categoryId) {
                const path = findCategoryPath(categoryTree, bookToEdit.categoryId);
                setSelectedPath(path || [bookToEdit.categoryId]);
            } else {
                setSelectedPath([]);
            }

            if (bookToEdit.id) {
                joinCollaborativeEdit(bookToEdit.id);
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
                warnThreshold: 0,
                tagIds: [],
                version: 0
            });
            if (defaultCategoryId) {
                const path = findCategoryPath(categoryTree, defaultCategoryId);
                setSelectedPath(path || [defaultCategoryId]);
            } else {
                setSelectedPath([]);
            }
        }

        return () => {
            if (bookToEdit?.id) {
                leaveCollaborativeEdit();
            }
        };
    }, [bookToEdit, isOpen, selectedCategory, categoryTree, joinCollaborativeEdit, leaveCollaborativeEdit]);

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

    useEffect(() => {
        return () => {
            cleanupWsListeners();
            if (bookToEdit?.id) {
                collaborativeEdit.leaveEdit();
            }
        };
    }, [cleanupWsListeners, bookToEdit?.id]);

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
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                categoryId: formData.categoryId || null
            };

            if (bookToEdit?.id) {
                const response = await submitBookWithVersion(
                    payload,
                    currentUser?.id || 1,
                    currentUser?.username || 'unknown'
                );

                if (response.hasConflict) {
                    setConflictData(response);
                    setShowConflict(true);
                } else {
                    onSuccess();
                    onClose();
                }
            } else {
                await request.post('/books', payload);
                onSuccess();
                onClose();
            }
        } catch (error) {
            console.error('Submit error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMerge = async () => {
        if (!conflictData || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const mergedData = {
                ...formData,
                version: conflictData.newVersion
            };

            const response = await submitBookWithVersion(
                mergedData,
                currentUser?.id || 1,
                currentUser?.username || 'unknown',
                false
            );

            if (response.hasConflict) {
                setConflictData(response);
            } else {
                setShowConflict(false);
                setConflictData(null);
                onSuccess();
                onClose();
            }
        } catch (error) {
            console.error('Merge error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleForceUpdate = async () => {
        if (!conflictData || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const response = await submitBookWithVersion(
                formData,
                currentUser?.id || 1,
                currentUser?.username || 'unknown',
                true
            );

            if (!response.hasConflict) {
                setShowConflict(false);
                setConflictData(null);
                onSuccess();
                onClose();
            }
        } catch (error) {
            console.error('Force update error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelConflict = () => {
        setShowConflict(false);
        setConflictData(null);
    };

    const renderOnlineEditors = () => {
        if (!bookToEdit?.id || onlineEditors.length === 0) return null;

        return (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                    <span className="text-sm font-medium text-blue-800">协同编辑中</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {onlineEditors.map((editor, index) => (
                        <div
                            key={`${editor.userId}-${editor.sessionId || index}`}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 rounded-full text-xs"
                        >
                            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-medium">
                                {editor.username?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-blue-800">{editor.username}</span>
                            <span className="text-blue-500">正在编辑</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderFieldLockIndicator = (fieldName) => {
        if (!bookToEdit?.id) return null;

        const lockInfo = getFieldLockInfo(fieldName);
        if (!lockInfo || lockInfo.editorUserId === currentUser?.id) return null;

        return (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-amber-600 text-xs bg-amber-50 px-2 py-1 rounded-lg">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>{lockInfo.editorUsername} 正在编辑</span>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-all p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all scale-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-gray-800">
                                {bookToEdit ? '编辑图书' : '新增图书'}
                            </h2>
                            {bookToEdit?.id && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                    <span>版本</span>
                                    <span className="font-mono font-semibold">{formData.version}</span>
                                </div>
                            )}
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {renderOnlineEditors()}

                        <div className="relative">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">书名</label>
                            <input
                                type="text"
                                required
                                disabled={isFieldLocked('title')}
                                className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${
                                    isFieldLocked('title') ? 'opacity-60 cursor-not-allowed bg-amber-50 border-amber-200' : ''
                                }`}
                                placeholder="填写图书名称"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                onFocus={() => handleFieldFocus('title')}
                                onBlur={() => handleFieldBlur('title')}
                            />
                            {renderFieldLockIndicator('title')}
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">分类</label>
                            <div className="relative" ref={cascaderRef}>
                                <div
                                    className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer flex items-center justify-between ${
                                        isFieldLocked('categoryId') ? 'opacity-60 cursor-not-allowed bg-amber-50 border-amber-200' : ''
                                    }`}
                                    onClick={() => !isFieldLocked('categoryId') && setCascaderOpen(!cascaderOpen)}
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
                                {renderFieldLockIndicator('categoryId')}

                                {cascaderOpen && !isFieldLocked('categoryId') && (
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

                        <div className="relative">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">作者</label>
                            <input
                                type="text"
                                required
                                disabled={isFieldLocked('author')}
                                className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${
                                    isFieldLocked('author') ? 'opacity-60 cursor-not-allowed bg-amber-50 border-amber-200' : ''
                                }`}
                                placeholder="填写作者名字"
                                value={formData.author}
                                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                                onFocus={() => handleFieldFocus('author')}
                                onBlur={() => handleFieldBlur('author')}
                            />
                            {renderFieldLockIndicator('author')}
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div className="relative">
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">价格 (¥)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    disabled={isFieldLocked('price')}
                                    className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${
                                        isFieldLocked('price') ? 'opacity-60 cursor-not-allowed bg-amber-50 border-amber-200' : ''
                                    }`}
                                    placeholder="0.00"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    onFocus={() => handleFieldFocus('price')}
                                    onBlur={() => handleFieldBlur('price')}
                                />
                                {renderFieldLockIndicator('price')}
                            </div>
                            <div className="relative">
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">出版日期</label>
                                <input
                                    type="date"
                                    disabled={isFieldLocked('publishDate')}
                                    className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${
                                        isFieldLocked('publishDate') ? 'opacity-60 cursor-not-allowed bg-amber-50 border-amber-200' : ''
                                    }`}
                                    value={formData.publishDate}
                                    onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                                    onFocus={() => handleFieldFocus('publishDate')}
                                    onBlur={() => handleFieldBlur('publishDate')}
                                />
                                {renderFieldLockIndicator('publishDate')}
                            </div>
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">简介</label>
                            <textarea
                                disabled={isFieldLocked('description')}
                                className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none ${
                                    isFieldLocked('description') ? 'opacity-60 cursor-not-allowed bg-amber-50 border-amber-200' : ''
                                }`}
                                rows="3"
                                placeholder="请输入内容简介..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                onFocus={() => handleFieldFocus('description')}
                                onBlur={() => handleFieldBlur('description')}
                            />
                            {renderFieldLockIndicator('description')}
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div className="relative">
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">总库存</label>
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    disabled={isFieldLocked('totalStock')}
                                    className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${
                                        isFieldLocked('totalStock') ? 'opacity-60 cursor-not-allowed bg-amber-50 border-amber-200' : ''
                                    }`}
                                    placeholder="请输入总库存数量"
                                    value={formData.totalStock}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setFormData({ ...formData, totalStock: val, availableStock: val });
                                    }}
                                    onFocus={() => handleFieldFocus('totalStock')}
                                    onBlur={() => handleFieldBlur('totalStock')}
                                />
                                {renderFieldLockIndicator('totalStock')}
                            </div>
                            <div className="relative">
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">预警阈值</label>
                                <input
                                    type="number"
                                    min="0"
                                    disabled={isFieldLocked('warnThreshold')}
                                    className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${
                                        isFieldLocked('warnThreshold') ? 'opacity-60 cursor-not-allowed bg-amber-50 border-amber-200' : ''
                                    }`}
                                    placeholder="0表示不预警"
                                    value={formData.warnThreshold}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setFormData({ ...formData, warnThreshold: val });
                                    }}
                                    onFocus={() => handleFieldFocus('warnThreshold')}
                                    onBlur={() => handleFieldBlur('warnThreshold')}
                                />
                                {renderFieldLockIndicator('warnThreshold')}
                            </div>
                        </div>
                        <p className="text-gray-400 text-xs -mt-2">当可借库存低于预警阈值时，系统会自动发送库存预警通知。设为 0 表示不启用预警。</p>

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
                                disabled={isSubmitting}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        提交中...
                                    </span>
                                ) : (
                                    '保 存'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <EditConflictModal
                isOpen={showConflict}
                onClose={() => setShowConflict(false)}
                conflictData={conflictData}
                onMerge={handleMerge}
                onForceUpdate={handleForceUpdate}
                onCancel={handleCancelConflict}
            />
        </>
    );
};

export default BookModal;
