import React, { useState, useEffect, useCallback } from 'react';
import request from '../api/request';
import StarRating from '../components/StarRating';

const MyFavorites = ({ user }) => {
    const [favorites, setFavorites] = useState([]);
    const [sortOrder, setSortOrder] = useState('desc');
    const [loading, setLoading] = useState(false);

    const fetchFavorites = useCallback(async () => {
        if (!user || !user.id) return;
        setLoading(true);
        try {
            const data = await request.get('/favorites/mine?userId=' + user.id + '&sortOrder=' + sortOrder);
            setFavorites(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [user, sortOrder]);

    useEffect(() => {
        fetchFavorites();
    }, [fetchFavorites]);

    useEffect(() => {
        const handler = function(e) {
            fetchFavorites();
        };
        window.addEventListener('favorite-changed', handler);
        return function() {
            window.removeEventListener('favorite-changed', handler);
        };
    }, [fetchFavorites]);

    const handleRemoveFavorite = async (item) => {
        if (!user) {
            alert('请先登录');
            return;
        }
        try {
            const result = await request.post('/favorites/remove', {
                userId: user.id,
                bookId: item.bookId
            });
            setFavorites(function(prev) {
                return prev.filter(function(f) { return f.bookId !== item.bookId; });
            });
            const detail = Object.assign({}, result, { bookId: item.bookId });
            window.dispatchEvent(new CustomEvent('favorite-changed', { detail: detail }));
        } catch (e) {
            alert(e.message || '取消收藏失败');
        }
    };

    const formatDate = function(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const pad = function(n) { return String(n).padStart(2, '0'); };
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    };

    return (
        <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                            </svg>
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">我的收藏</p>
                            <p className="text-2xl font-bold text-gray-800">{favorites.length}</p>
                        </div>
                    </div>
                </div>
                <div className="md:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-5 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-sm mb-2">排序方式</p>
                        <div className="flex gap-2">
                            <button
                                onClick={function() { setSortOrder('desc'); }}
                                className={sortOrder === 'desc' ? 'px-4 py-2 rounded-lg text-sm font-medium transition-all bg-pink-500 text-white shadow-md' : 'px-4 py-2 rounded-lg text-sm font-medium transition-all bg-gray-100 text-gray-600 hover:bg-gray-200'}
                            >
                                最新收藏
                            </button>
                            <button
                                onClick={function() { setSortOrder('asc'); }}
                                className={sortOrder === 'asc' ? 'px-4 py-2 rounded-lg text-sm font-medium transition-all bg-pink-500 text-white shadow-md' : 'px-4 py-2 rounded-lg text-sm font-medium transition-all bg-gray-100 text-gray-600 hover:bg-gray-200'}
                            >
                                最早收藏
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-gradient-to-r from-pink-50 to-white gap-4">
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">我的收藏</h2>
                        <p className="text-gray-500 text-sm mt-1">
                            {favorites.length > 0 ? '共收藏 ' + favorites.length + ' 本图书，点击心形可取消收藏' : '快去列表页收藏您喜欢的图书吧'}
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="text-center py-16">
                            <svg className="animate-spin h-10 w-10 text-pink-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="mt-4 text-gray-500">加载中...</p>
                        </div>
                    ) : favorites.length > 0 ? (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                                    <th className="px-8 py-5 border-b border-gray-100">书籍信息</th>
                                    <th className="px-6 py-5 border-b border-gray-100">作者</th>
                                    <th className="px-6 py-5 border-b border-gray-100">分类</th>
                                    <th className="px-6 py-5 border-b border-gray-100">标签</th>
                                    <th className="px-6 py-5 border-b border-gray-100">收藏时间</th>
                                    <th className="px-6 py-5 border-b border-gray-100">被收藏</th>
                                    <th className="px-6 py-5 border-b border-gray-100 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {favorites.map(function(item) {
                                    return (
                                        <tr key={item.favoriteId} className="hover:bg-pink-50/30 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-lg shadow-sm">
                                                        {item.title && item.title.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900">{item.title}</div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <StarRating rating={item.avgRating} size="sm" showValue={true} />
                                                            <span className="text-xs text-gray-400">({item.reviewCount || 0}条评价)</span>
                                                        </div>
                                                        <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{item.description}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                                        </svg>
                                                    </div>
                                                    <span className="text-gray-700 font-medium">{item.author}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                {item.categoryName ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200">
                                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                                                        </svg>
                                                        {item.categoryName}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">未分类</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-wrap gap-1">
                                                    {item.tags && item.tags.length > 0 ? (
                                                        item.tags.map(function(tag) {
                                                            return (
                                                                <span key={tag.id} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium text-white" style={{ backgroundColor: tag.color }}>
                                                                    {tag.name}
                                                                </span>
                                                            );
                                                        })
                                                    ) : (
                                                        <span className="text-xs text-gray-400">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                    </svg>
                                                    {formatDate(item.createdAt)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="inline-flex items-center gap-1.5 text-sm text-pink-600 font-medium">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                                                    </svg>
                                                    {item.favoriteCount || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={function() { handleRemoveFavorite(item); }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-pink-50 text-pink-600 hover:bg-pink-100 transition-colors"
                                                        title="取消收藏"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                                                        </svg>
                                                        取消收藏
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-24">
                            <div className="w-24 h-24 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-12 h-12 text-pink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">暂无收藏</h3>
                            <p className="text-gray-500 mt-1">去图书列表页，收藏您喜欢的图书吧</p>
                            <p className="text-pink-500 text-sm mt-2">💝 收藏后可以在这里快速找到它们</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyFavorites;
