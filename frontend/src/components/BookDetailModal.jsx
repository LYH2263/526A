import React, { useState, useEffect, useCallback, useRef } from 'react';
import request from '../api/request';
import StarRating from './StarRating';
import StarRatingInput from './StarRatingInput';

const MAX_CONTENT_LENGTH = 500;

const BookDetailModal = ({ isOpen, onClose, book, user, onReviewUpdated }) => {
    const [reviews, setReviews] = useState([]);
    const [totalReviews, setTotalReviews] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(5);
    const [sortBy, setSortBy] = useState('time');
    const [sortOrder, setSortOrder] = useState('desc');
    const [filterRating, setFilterRating] = useState(null);
    const [ratingDistribution, setRatingDistribution] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    const [myReview, setMyReview] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editRating, setEditRating] = useState(5);
    const [editContent, setEditContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);
    const initializedRef = useRef(false);

    const fetchReviews = useCallback(async () => {
        if (!book?.id) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('size', pageSize);
            params.append('sortBy', sortBy);
            params.append('sortOrder', sortOrder);
            if (filterRating !== null) {
                params.append('rating', filterRating);
            }
            const data = await request.get(`/books/${book.id}/reviews?${params.toString()}`);
            setReviews(data.list || []);
            setTotalReviews(data.total || 0);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [book?.id, page, pageSize, sortBy, sortOrder, filterRating]);

    const fetchRatingDistribution = useCallback(async () => {
        if (!book?.id) return;
        try {
            const data = await request.get(`/books/${book.id}/reviews/rating-distribution`);
            setRatingDistribution(data || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
        } catch (e) {
            console.error(e);
        }
    }, [book?.id]);

    const fetchMyReview = useCallback(async () => {
        if (!book?.id || !user?.id) return;
        try {
            const data = await request.get(`/books/${book.id}/reviews/my?userId=${user.id}`);
            setMyReview(data);
            if (data) {
                setEditRating(data.rating);
                setEditContent(data.content || '');
            }
        } catch (e) {
            console.error(e);
        }
    }, [book?.id, user?.id]);

    useEffect(() => {
        if (isOpen && book && !initializedRef.current) {
            initializedRef.current = true;
            setPage(1);
            setFilterRating(null);
            setIsEditing(false);
            fetchReviews();
            fetchRatingDistribution();
            fetchMyReview();
        }
        if (!isOpen) {
            initializedRef.current = false;
        }
    }, [isOpen, book]);

    useEffect(() => {
        if (isOpen && book && initializedRef.current) {
            fetchReviews();
        }
    }, [page, sortBy, sortOrder, filterRating]);

    const refreshAll = useCallback(() => {
        fetchReviews();
        fetchRatingDistribution();
        fetchMyReview();
    }, [fetchReviews, fetchRatingDistribution, fetchMyReview]);

    const handleSubmitReview = async () => {
        if (!editRating || editRating < 1 || editRating > 5) {
            alert('请选择评分');
            return;
        }
        if (!editContent.trim()) {
            alert('评论内容不能为空');
            return;
        }
        if (editContent.length > MAX_CONTENT_LENGTH) {
            alert(`评论内容不能超过${MAX_CONTENT_LENGTH}字`);
            return;
        }

        setSubmitting(true);
        try {
            await request.post(`/books/${book.id}/reviews`, {
                userId: user.id,
                rating: editRating,
                content: editContent
            });
            setIsEditing(false);
            setPage(1);
            refreshAll();
            if (onReviewUpdated) {
                onReviewUpdated();
            }
        } catch (e) {
            alert(e.message || '提交失败');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!confirm('确定要删除这条评论吗？')) return;
        try {
            await request.delete(`/reviews/${reviewId}?userId=${user.id}`);
            setPage(1);
            refreshAll();
            if (onReviewUpdated) {
                onReviewUpdated();
            }
        } catch (e) {
            alert(e.message || '删除失败');
        }
    };

    const handleStartEdit = () => {
        if (myReview) {
            setEditRating(myReview.rating);
            setEditContent(myReview.content || '');
        }
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        if (myReview) {
            setEditRating(myReview.rating);
            setEditContent(myReview.content || '');
        } else {
            setEditRating(5);
            setEditContent('');
        }
    };

    const handleFilterRating = (rating) => {
        if (filterRating === rating) {
            setFilterRating(null);
        } else {
            setFilterRating(rating);
        }
        setPage(1);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const totalPages = Math.ceil(totalReviews / pageSize);

    const totalRatingCount = Object.values(ratingDistribution).reduce((sum, c) => sum + (c || 0), 0);

    const handleToggleFavorite = async () => {
        if (!user) {
            alert('请先登录');
            return;
        }
        try {
            const result = await request.post('/favorites/toggle', {
                userId: user.id,
                bookId: book.id,
                favorited: !!book.favorited
            });
            const updatedBook = { ...book, favorited: result.favorited, favoriteCount: result.favoriteCount };
            if (typeof onReviewUpdated === 'function') {
                onReviewUpdated(updatedBook);
            }
            window.dispatchEvent(new CustomEvent('favorite-changed', { detail: { bookId: book.id, ...result } }));
        } catch (e) {
            alert(e.message || '操作失败');
        }
    };

    if (!isOpen || !book) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-all p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] transform transition-all scale-100 overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-800">图书详情</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex gap-4 mb-6 pb-6 border-b border-gray-100">
                        <div className="h-20 w-20 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-2xl shadow-sm flex-shrink-0">
                            {book.title.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                                <h3 className="text-xl font-bold text-gray-800 mb-1">{book.title}</h3>
                                <button
                                    onClick={handleToggleFavorite}
                                    className="flex items-center gap-1.5 flex-shrink-0 transition-all p-2 rounded-lg hover:bg-gray-50"
                                    title={book.favorited ? '取消收藏' : '收藏'}
                                >
                                    <svg
                                        className={`w-6 h-6 transition-all ${
                                            book.favorited
                                                ? 'text-red-500 fill-current scale-110'
                                                : 'text-gray-300 hover:text-red-400'
                                        }`}
                                        fill={book.favorited ? 'currentColor' : 'none'}
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                    <span className={`text-sm font-medium ${
                                        book.favorited ? 'text-red-500' : 'text-gray-400'
                                    }`}>
                                        {book.favoriteCount || 0}
                                    </span>
                                </button>
                            </div>
                            <p className="text-gray-500 text-sm mb-2">作者：{book.author}</p>
                            <div className="flex items-center gap-3">
                                <StarRating
                                    rating={book.avgRating}
                                    size="md"
                                    showValue={true}
                                    reviewCount={book.reviewCount || 0}
                                />
                            </div>
                            {book.categoryName && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-violet-100 text-violet-700 mt-2">
                                    {book.categoryName}
                                </span>
                            )}
                            {book.tags && book.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {book.tags.map(tag => (
                                        <span
                                            key={tag.id}
                                            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium text-white"
                                            style={{ backgroundColor: tag.color }}
                                        >
                                            {tag.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold text-gray-800">我的评价</h4>
                            {myReview && !isEditing && (
                                <button
                                    onClick={handleStartEdit}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    编辑
                                </button>
                            )}
                        </div>

                        {myReview && !isEditing ? (
                            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                                <div className="flex items-center justify-between mb-2">
                                    <StarRating rating={myReview.rating} size="md" showValue={true} />
                                    <span className="text-xs text-gray-400">
                                        {myReview.updatedAt ? formatDate(myReview.updatedAt) : formatDate(myReview.createdAt)}
                                    </span>
                                </div>
                                <p className="text-gray-700 text-sm whitespace-pre-wrap break-words">
                                    {myReview.content}
                                </p>
                                <button
                                    onClick={() => handleDeleteReview(myReview.id)}
                                    className="mt-3 text-xs text-red-500 hover:text-red-600"
                                >
                                    删除评论
                                </button>
                            </div>
                        ) : isEditing ? (
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <div className="mb-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">评分</label>
                                    <StarRatingInput
                                        rating={editRating}
                                        onChange={setEditRating}
                                        size="lg"
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        评论内容
                                        <span className={`ml-2 text-xs ${editContent.length > MAX_CONTENT_LENGTH ? 'text-red-500' : 'text-gray-400'}`}>
                                            {editContent.length}/{MAX_CONTENT_LENGTH}
                                        </span>
                                    </label>
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        placeholder="分享你的阅读感受..."
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none text-sm"
                                        rows="3"
                                        maxLength={MAX_CONTENT_LENGTH}
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={handleCancelEdit}
                                        className="px-4 py-2 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={handleSubmitReview}
                                        disabled={submitting}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {submitting ? '提交中...' : (myReview ? '更新评论' : '发表评论')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleStartEdit}
                                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors text-sm"
                            >
                                + 发表我的评论
                            </button>
                        )}
                    </div>

                    <div>
                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-semibold text-gray-800">
                                    全部评论 <span className="text-gray-400 font-normal text-sm">({totalReviews})</span>
                                </h4>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={sortBy}
                                        onChange={(e) => {
                                            setSortBy(e.target.value);
                                            setPage(1);
                                        }}
                                        className="text-sm px-2 py-1 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="time">按时间</option>
                                        <option value="rating">按评分</option>
                                    </select>
                                    <button
                                        onClick={() => {
                                            setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                                            setPage(1);
                                        }}
                                        className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                        title={sortOrder === 'desc' ? '降序' : '升序'}
                                    >
                                        <svg
                                            className={`w-4 h-4 text-gray-500 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-4">
                                <div className="grid grid-cols-5 gap-2">
                                    {[5, 4, 3, 2, 1].map((star) => {
                                        const count = ratingDistribution[star] || 0;
                                        const pct = totalRatingCount > 0 ? (count / totalRatingCount * 100) : 0;
                                        const isActive = filterRating === star;
                                        return (
                                            <button
                                                key={star}
                                                onClick={() => handleFilterRating(star)}
                                                className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all ${
                                                    isActive
                                                        ? 'bg-blue-100 border border-blue-300'
                                                        : 'hover:bg-gray-100 border border-transparent'
                                                }`}
                                            >
                                                <div className="flex items-center gap-0.5">
                                                    {Array.from({ length: star }).map((_, i) => (
                                                        <svg key={i} className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                        </svg>
                                                    ))}
                                                </div>
                                                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-yellow-400 rounded-full transition-all"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {count} <span className="text-gray-400">({pct.toFixed(0)}%)</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                {filterRating !== null && (
                                    <div className="mt-3 flex items-center justify-between pt-3 border-t border-gray-200">
                                        <span className="text-xs text-gray-500">
                                            当前筛选：<span className="text-blue-600 font-medium">{filterRating} 星评论</span>
                                        </span>
                                        <button
                                            onClick={() => handleFilterRating(filterRating)}
                                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            清除筛选
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-8 text-gray-400">加载中...</div>
                        ) : reviews.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <p className="text-gray-400 text-sm">
                                    {filterRating !== null ? '该星级下暂无评论' : '暂无评论，快来抢沙发吧~'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {reviews.map((review) => (
                                    <div key={review.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs text-white font-bold">
                                                    {review.username?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <span className="text-sm font-medium text-gray-800">{review.username}</span>
                                                    <StarRating rating={review.rating} size="sm" />
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-400">{formatDate(review.createdAt)}</span>
                                        </div>
                                        <p className="text-gray-600 text-sm ml-10 whitespace-pre-wrap break-words">
                                            {review.content}
                                        </p>
                                        {review.userId === user?.id && (
                                            <button
                                                onClick={() => handleDeleteReview(review.id)}
                                                className="ml-10 mt-2 text-xs text-red-400 hover:text-red-500"
                                            >
                                                删除
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-6">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    上一页
                                </button>
                                <span className="text-sm text-gray-500">
                                    第 {page} / {totalPages} 页
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    下一页
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookDetailModal;
