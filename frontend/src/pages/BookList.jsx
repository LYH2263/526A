import React, { useState, useEffect, useCallback } from 'react';
import request from '../api/request';
import BookModal from '../components/BookModal';
import DeleteModal from '../components/DeleteModal';
import CategoryTree from '../components/CategoryTree';
import BookDetailModal from '../components/BookDetailModal';
import StarRating from '../components/StarRating';
import TagFilter from '../components/TagFilter';

const BookList = ({ user, initialBookId, onNotificationBookCleared }) => {
    const [books, setBooks] = useState([]);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [currentBook, setCurrentBook] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState({ type: 'all' });
    const [treeRefreshKey, setTreeRefreshKey] = useState(0);
    const [borrowedCount, setBorrowedCount] = useState(0);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [detailBook, setDetailBook] = useState(null);
    const [selectedTagIds, setSelectedTagIds] = useState([]);
    const [tagSemantic, setTagSemantic] = useState('OR');

    const fetchBooks = useCallback(async () => {
        try {
            let url = '/books';
            const params = new URLSearchParams();

            if (user?.id) {
                params.append('userId', user.id);
            }

            if (selectedTagIds.length > 0) {
                selectedTagIds.forEach(id => params.append('tagIds', id));
                params.append('tagSemantic', tagSemantic);
                url += `?${params.toString()}`;
            } else if (selectedCategory.type === 'category') {
                params.append('filterByCategory', 'true');
                params.append('categoryId', selectedCategory.id);
                url += `?${params.toString()}`;
            } else if (selectedCategory.type === 'uncategorized') {
                const qs = params.toString();
                url = qs ? `/books/uncategorized?${qs}` : '/books/uncategorized';
            } else {
                const qs = params.toString();
                if (qs) url += `?${qs}`;
            }

            const data = await request.get(url);
            setBooks(data);
            return data;
        } catch (e) {
            console.error(e);
            return [];
        }
    }, [selectedCategory, selectedTagIds, tagSemantic, user]);

    const fetchBorrowedCount = useCallback(async () => {
        try {
            const count = await request.get('/borrow/stats/borrowed-count');
            setBorrowedCount(count);
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => {
        fetchBooks();
        fetchBorrowedCount();
    }, [fetchBooks, fetchBorrowedCount]);

    useEffect(() => {
        if (initialBookId && books.length > 0) {
            const book = books.find(b => b.id === initialBookId);
            if (book) {
                setDetailBook(book);
                setIsDetailOpen(true);
            }
            if (onNotificationBookCleared) {
                onNotificationBookCleared();
            }
        }
    }, [initialBookId, books, onNotificationBookCleared]);

    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
    };

    const handleTreeChange = () => {
        setTreeRefreshKey(prev => prev + 1);
    };

    const handleEdit = (book) => {
        setCurrentBook(book);
        setIsEditOpen(true);
    };

    const handleViewDetail = (book) => {
        setDetailBook(book);
        setIsDetailOpen(true);
    };

    const handleAdd = () => {
        setCurrentBook(null);
        setIsEditOpen(true);
    };

    const handleDeleteClick = (book) => {
        setCurrentBook(book);
        setIsDeleteOpen(true);
    };

    const confirmDelete = async () => {
        try {
            await request.delete(`/books/${currentBook.id}`);
            setIsDeleteOpen(false);
            fetchBooks();
            fetchBorrowedCount();
        } catch (e) {
            console.error(e);
        }
    };

    const handleBorrow = async (book) => {
        if (book.availableStock <= 0) return;
        try {
            await request.post('/borrow/borrow', {
                bookId: book.id,
                borrower: user?.username || 'admin'
            });
            alert('借阅成功！');
            fetchBooks();
            fetchBorrowedCount();
            window.dispatchEvent(new CustomEvent('stock-changed'));
        } catch (e) {
            alert(e.message || '借阅失败');
        }
    };

    const handleToggleFavorite = async (book, e) => {
        e.stopPropagation();
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
            setBooks(prev => prev.map(b => {
                if (b.id === book.id) {
                    return { ...b, favorited: result.favorited, favoriteCount: result.favoriteCount };
                }
                return b;
            }));
            if (detailBook && detailBook.id === book.id) {
                setDetailBook(prev => ({ ...prev, favorited: result.favorited, favoriteCount: result.favoriteCount }));
            }
            window.dispatchEvent(new CustomEvent('favorite-changed', { detail: { bookId: book.id, ...result } }));
        } catch (e) {
            alert(e.message || '操作失败');
        }
    };

    const getPageTitle = () => {
        switch (selectedCategory.type) {
            case 'all':
                return { title: '图书列表', subtitle: '管理您的所有藏书信息' };
            case 'uncategorized':
                return { title: '未分类图书', subtitle: '尚未归类的图书' };
            case 'category':
                return { title: selectedCategory.name, subtitle: '该分类及其子分类下的图书' };
            default:
                return { title: '图书列表', subtitle: '管理您的所有藏书信息' };
        }
    };

    const pageInfo = getPageTitle();

    const handleModalSuccess = () => {
        fetchBooks();
        fetchBorrowedCount();
        setTreeRefreshKey(prev => prev + 1);
        window.dispatchEvent(new CustomEvent('stock-changed'));
    };

    const handleReviewUpdated = async () => {
        const bookList = await fetchBooks();
        if (detailBook) {
            const updatedBook = bookList.find(b => b.id === detailBook.id);
            if (updatedBook) {
                setDetailBook(updatedBook);
            }
        }
    };

    return (
        <div className="flex gap-6 h-full">
            <div className="w-72 flex-shrink-0 h-[calc(100vh-8rem)]">
                <CategoryTree
                    key={treeRefreshKey}
                    selectedCategory={selectedCategory}
                    onSelectCategory={handleCategorySelect}
                    onTreeChange={handleTreeChange}
                />
            </div>

            <div className="flex-1 min-w-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm">图书总数</p>
                                <p className="text-2xl font-bold text-gray-800">{books.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm">在借总数</p>
                                <p className="text-2xl font-bold text-orange-600">{borrowedCount}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm">可借总数</p>
                                <p className="text-2xl font-bold text-emerald-600">
                                    {books.reduce((sum, b) => sum + (b.availableStock || 0), 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <TagFilter
                    selectedTagIds={selectedTagIds}
                    onTagsChange={setSelectedTagIds}
                    semantic={tagSemantic}
                    onSemanticChange={setTagSemantic}
                />

                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-gradient-to-r from-gray-50 to-white gap-4">
                        <div>
                            <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">{pageInfo.title}</h2>
                            <p className="text-gray-500 text-sm mt-1">{pageInfo.subtitle}</p>
                        </div>
                        <button
                            onClick={handleAdd}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl shadow-blue-500/30 transition-all duration-200 flex items-center gap-2 transform hover:-translate-y-0.5"
                        >
                            <div className="bg-white/20 rounded-full p-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            添加新书
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                                    <th className="px-8 py-5 border-b border-gray-100">书籍信息</th>
                                    <th className="px-6 py-5 border-b border-gray-100">作者</th>
                                    <th className="px-6 py-5 border-b border-gray-100">分类</th>
                                    <th className="px-6 py-5 border-b border-gray-100">标签</th>
                                    <th className="px-6 py-5 border-b border-gray-100">价格</th>
                                    <th className="px-6 py-5 border-b border-gray-100">库存</th>
                                    <th className="px-6 py-5 border-b border-gray-100">收藏</th>
                                    <th className="px-6 py-5 border-b border-gray-100 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {books.map((book) => (
                                    <tr key={book.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg shadow-sm">
                                                    {book.title.charAt(0)}
                                                </div>
                                                <div>
                                                    <button
                                                        onClick={() => handleViewDetail(book)}
                                                        className="font-bold text-gray-900 hover:text-blue-600 transition-colors text-left"
                                                    >
                                                        {book.title}
                                                    </button>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <StarRating
                                                            rating={book.avgRating}
                                                            size="sm"
                                                            showValue={true}
                                                        />
                                                        <span className="text-xs text-gray-400">
                                                            ({book.reviewCount || 0}条评价)
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{book.description}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                </div>
                                                <span className="text-gray-700 font-medium">{book.author}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            {book.categoryName ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200">
                                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                                    </svg>
                                                    {book.categoryName}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                                    未分类
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-wrap gap-1">
                                                {book.tags && book.tags.length > 0 ? (
                                                    book.tags.map(tag => (
                                                        <span
                                                            key={tag.id}
                                                            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium text-white"
                                                            style={{ backgroundColor: tag.color }}
                                                        >
                                                            {tag.name}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-gray-400">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                                                ¥{Number(book.price).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                                                    book.warnThreshold > 0 && book.availableStock <= book.warnThreshold
                                                        ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                                        : book.availableStock > 0
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {book.warnThreshold > 0 && book.availableStock <= book.warnThreshold && (
                                                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                        </svg>
                                                    )}
                                                    可借 {book.availableStock || 0}
                                                </span>
                                                <span className="text-gray-400 text-xs">
                                                    / 共 {book.totalStock || 0}
                                                </span>
                                                {book.warnThreshold > 0 && (
                                                    <span className="text-xs text-gray-400">
                                                        (预警: {book.warnThreshold})
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <button
                                                onClick={(e) => handleToggleFavorite(book, e)}
                                                className="flex items-center gap-1.5 group/fav transition-all"
                                                title={book.favorited ? '取消收藏' : '收藏'}
                                            >
                                                <svg
                                                    className={`w-5 h-5 transition-all ${
                                                        book.favorited
                                                            ? 'text-red-500 fill-current scale-110'
                                                            : 'text-gray-300 hover:text-red-400 group-hover/fav:scale-110'
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
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleViewDetail(book)}
                                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="查看详情"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleBorrow(book)}
                                                    disabled={book.availableStock <= 0}
                                                    title={book.availableStock > 0 ? '借阅' : '库存不足'}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                                        book.availableStock > 0
                                                            ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow'
                                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    }`}
                                                >
                                                    借阅
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(book)}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="编辑"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 00 2 2h11a2 2 0 00 2-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(book)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="删除"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {books.length === 0 && (
                            <div className="text-center py-24">
                                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">
                                    {selectedCategory.type === 'all' ? '暂无图书' : '该分类下暂无图书'}
                                </h3>
                                <p className="text-gray-500 mt-1">
                                    {selectedCategory.type === 'all'
                                        ? '开始添加您的第一本书吧'
                                        : '可以添加新书到此分类或选择其他分类查看'}
                                </p>
                            </div>
                        )}
                    </div>

                    <BookModal
                        isOpen={isEditOpen}
                        onClose={() => setIsEditOpen(false)}
                        onSuccess={handleModalSuccess}
                        bookToEdit={currentBook}
                        selectedCategory={selectedCategory}
                    />

                    <DeleteModal
                        isOpen={isDeleteOpen}
                        onClose={() => setIsDeleteOpen(false)}
                        onConfirm={confirmDelete}
                        bookTitle={currentBook?.title}
                    />

                    <BookDetailModal
                        isOpen={isDetailOpen}
                        onClose={() => setIsDetailOpen(false)}
                        book={detailBook}
                        user={user}
                        onReviewUpdated={handleReviewUpdated}
                    />
                </div>
            </div>
        </div>
    );
};

export default BookList;
