import React, { useState, useCallback } from 'react';
import { detectDuplicates, mergeDuplicates } from '../api/duplicateDetection';

const DuplicateDetection = () => {
    const [threshold, setThreshold] = useState(0.6);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [detected, setDetected] = useState(false);
    const [selectedPrimary, setSelectedPrimary] = useState({});
    const [merging, setMerging] = useState(false);
    const [mergeResult, setMergeResult] = useState(null);
    const [previewGroup, setPreviewGroup] = useState(null);

    const handleDetect = useCallback(async () => {
        setLoading(true);
        setDetected(false);
        setMergeResult(null);
        setSelectedPrimary({});
        setPreviewGroup(null);
        try {
            const data = await detectDuplicates(threshold);
            setGroups(data || []);
            setDetected(true);
        } catch (e) {
            console.error(e);
            alert('查重失败: ' + (e.message || '未知错误'));
        } finally {
            setLoading(false);
        }
    }, [threshold]);

    const handleSelectPrimary = (groupId, bookId) => {
        setSelectedPrimary(prev => ({ ...prev, [groupId]: bookId }));
    };

    const getDiffFields = (books) => {
        if (!books || books.length < 2) return [];
        const ref = books[0];
        const fields = [
            { key: 'title', label: '书名' },
            { key: 'author', label: '作者' },
            { key: 'price', label: '价格' },
            { key: 'publishDate', label: '出版日期' },
            { key: 'totalStock', label: '总库存' },
            { key: 'availableStock', label: '可借库存' },
            { key: 'categoryName', label: '分类' },
        ];
        return fields.filter(f => {
            const vals = books.map(b => String(b[f.key] ?? ''));
            return new Set(vals).size > 1;
        });
    };

    const handleMergeGroup = async (group) => {
        const primaryId = selectedPrimary[group.groupId];
        if (!primaryId) {
            alert('请先选择主记录');
            return;
        }
        const duplicateIds = group.books.filter(b => b.id !== primaryId).map(b => b.id);
        if (duplicateIds.length === 0) return;

        const primaryBook = group.books.find(b => b.id === primaryId);
        const dupNames = group.books.filter(b => b.id !== primaryId).map(b => `"${b.title}"(ID:${b.id})`).join('、');
        const confirmed = window.confirm(
            `确认将 ${dupNames}\n合并到主记录 "${primaryBook.title}"(ID:${primaryId})？\n\n此操作不可逆，重复合并的引用数据将迁移到主记录。`
        );
        if (!confirmed) return;

        setMerging(true);
        try {
            const result = await mergeDuplicates(primaryId, duplicateIds);
            setMergeResult(result);
            const data = await detectDuplicates(threshold);
            setGroups(data || []);
            setSelectedPrimary(prev => {
                const next = { ...prev };
                delete next[group.groupId];
                return next;
            });
            setPreviewGroup(null);
        } catch (e) {
            alert('合并失败: ' + (e.message || '未知错误'));
        } finally {
            setMerging(false);
        }
    };

    const getSimilarityColor = (sim) => {
        if (sim >= 0.9) return 'text-red-600 bg-red-50 border-red-200';
        if (sim >= 0.75) return 'text-orange-600 bg-orange-50 border-orange-200';
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    };

    const getSimilarityBar = (sim) => {
        const pct = Math.round(sim * 100);
        let color = 'bg-yellow-400';
        if (sim >= 0.9) color = 'bg-red-500';
        else if (sim >= 0.75) color = 'bg-orange-500';
        return (
            <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm font-mono font-medium w-12 text-right">{pct}%</span>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">重复检测</h2>
                            <p className="text-gray-500 text-sm mt-1">智能检测相似图书，合并重复记录保持数据整洁</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                                <label className="text-sm font-medium text-gray-600 whitespace-nowrap">相似度阈值</label>
                                <input
                                    type="range"
                                    min="0.3"
                                    max="1.0"
                                    step="0.05"
                                    value={threshold}
                                    onChange={e => setThreshold(parseFloat(e.target.value))}
                                    className="w-32 accent-blue-600"
                                />
                                <span className="text-sm font-mono font-bold text-blue-600 min-w-[3rem] text-right">
                                    {Math.round(threshold * 100)}%
                                </span>
                            </div>
                            <button
                                onClick={handleDetect}
                                disabled={loading}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl shadow-blue-500/30 transition-all duration-200 flex items-center gap-2 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        检测中...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        开始检测
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {detected && groups.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">未发现重复图书</h3>
                        <p className="text-gray-500 mt-1">当前阈值下所有图书均无明显重复</p>
                    </div>
                )}

                {detected && groups.length > 0 && (
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                            <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            发现 <span className="font-bold text-orange-600">{groups.length}</span> 组疑似重复，共涉及 <span className="font-bold text-orange-600">{groups.reduce((s, g) => s + g.books.length, 0)}</span> 条记录
                        </div>

                        <div className="space-y-4">
                            {groups.map((group) => {
                                const diffFields = getDiffFields(group.books);
                                const primaryId = selectedPrimary[group.groupId];
                                const isPreview = previewGroup === group.groupId;

                                return (
                                    <div key={group.groupId} className="border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-b border-gray-200">
                                            <div className="flex items-center gap-3">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 text-orange-600 font-bold text-sm">
                                                    {group.groupId}
                                                </span>
                                                <span className="text-sm font-medium text-gray-700">
                                                    疑似重复组 ({group.books.length}条记录)
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${getSimilarityColor(group.maxSimilarity)}`}>
                                                    最高相似度 {Math.round(group.maxSimilarity * 100)}%
                                                </span>
                                                <button
                                                    onClick={() => setPreviewGroup(isPreview ? null : group.groupId)}
                                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 hover:bg-blue-50 rounded"
                                                >
                                                    {isPreview ? '收起对比' : '字段对比'}
                                                </button>
                                            </div>
                                        </div>

                                        {isPreview && diffFields.length > 0 && (
                                            <div className="px-6 py-4 bg-blue-50/50 border-b border-blue-100">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">字段差异对照</h4>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="border-b border-blue-100">
                                                                <th className="text-left py-2 px-3 text-gray-500 font-medium">字段</th>
                                                                {group.books.map(b => (
                                                                    <th key={b.id} className="text-left py-2 px-3 text-gray-500 font-medium">
                                                                        ID:{b.id}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {diffFields.map(f => (
                                                                <tr key={f.key} className="border-b border-blue-50">
                                                                    <td className="py-2 px-3 font-medium text-gray-600">{f.label}</td>
                                                                    {group.books.map(b => {
                                                                        const val = String(b[f.key] ?? '-');
                                                                        const refVal = String(group.books[0][f.key] ?? '-');
                                                                        const isDiff = val !== refVal;
                                                                        return (
                                                                            <td key={b.id} className={`py-2 px-3 ${isDiff ? 'bg-yellow-100 text-yellow-800 font-medium rounded' : 'text-gray-600'}`}>
                                                                                {f.key === 'price' && val !== '-' ? `¥${Number(val).toFixed(2)}` : val}
                                                                            </td>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {isPreview && diffFields.length === 0 && (
                                            <div className="px-6 py-3 bg-green-50/50 border-b border-green-100 text-sm text-green-700">
                                                所有字段值完全一致，可直接合并
                                            </div>
                                        )}

                                        <div className="divide-y divide-gray-50">
                                            {group.books.map((book) => (
                                                <div
                                                    key={book.id}
                                                    className={`px-6 py-4 flex items-center gap-4 transition-all ${
                                                        primaryId === book.id ? 'bg-blue-50/60 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`group-${group.groupId}`}
                                                        checked={primaryId === book.id}
                                                        onChange={() => handleSelectPrimary(group.groupId, book.id)}
                                                        className="w-4 h-4 text-blue-600 accent-blue-600"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                                                                {book.title.charAt(0)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-bold text-gray-900 truncate">{book.title}</div>
                                                                <div className="text-sm text-gray-500 truncate">{book.author}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 flex-shrink-0">
                                                        <span className="text-sm text-gray-500">¥{Number(book.price).toFixed(2)}</span>
                                                        {book.publishDate && (
                                                            <span className="text-xs text-gray-400">{book.publishDate}</span>
                                                        )}
                                                        {book.categoryName && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-700">
                                                                {book.categoryName}
                                                            </span>
                                                        )}
                                                        <div className="w-32">
                                                            {getSimilarityBar(book.similarityToRef)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-200 flex justify-end">
                                            <button
                                                onClick={() => handleMergeGroup(group)}
                                                disabled={!primaryId || merging}
                                                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                                                    primaryId
                                                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl shadow-red-500/30 transform hover:-translate-y-0.5'
                                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                }`}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                </svg>
                                                {merging ? '合并中...' : '合并到选中记录'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {!detected && !loading && (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">点击"开始检测"查找重复图书</h3>
                        <p className="text-gray-500 mt-1">调整相似度阈值后点击检测，系统将自动比对书名和作者信息</p>
                    </div>
                )}
            </div>

            {mergeResult && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="font-bold text-green-800">合并完成</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div className="bg-white rounded-lg p-3 border border-green-100">
                            <p className="text-gray-500 text-xs">合并记录</p>
                            <p className="font-bold text-green-700 text-lg">{mergeResult.mergedCount}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-green-100">
                            <p className="text-gray-500 text-xs">迁移收藏</p>
                            <p className="font-bold text-green-700 text-lg">{mergeResult.migratedFavorites}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-green-100">
                            <p className="text-gray-500 text-xs">迁移借阅</p>
                            <p className="font-bold text-green-700 text-lg">{mergeResult.migratedBorrowRecords}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-green-100">
                            <p className="text-gray-500 text-xs">迁移评论</p>
                            <p className="font-bold text-green-700 text-lg">{mergeResult.migratedReviews}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-green-100">
                            <p className="text-gray-500 text-xs">主记录ID</p>
                            <p className="font-bold text-green-700 text-lg">{mergeResult.primaryBookId}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DuplicateDetection;
