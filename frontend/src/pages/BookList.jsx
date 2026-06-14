import React, { useState, useEffect } from 'react';
import request from '../api/request';
import BookModal from '../components/BookModal';
import DeleteModal from '../components/DeleteModal';

const BookList = () => {
    const [books, setBooks] = useState([]);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [currentBook, setCurrentBook] = useState(null);

    const fetchBooks = async () => {
        try {
            const data = await request.get('/books');
            setBooks(data);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchBooks();
    }, []);

    const handleEdit = (book) => {
        setCurrentBook(book);
        setIsEditOpen(true);
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
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-gradient-to-r from-gray-50 to-white gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">图书列表</h2>
                    <p className="text-gray-500 text-sm mt-1">管理您的所有藏书信息</p>
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
                            <th className="px-6 py-5 border-b border-gray-100">价格</th>
                            <th className="px-6 py-5 border-b border-gray-100">出版日期</th>
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
                                            <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{book.title}</div>
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
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                                        ¥{Number(book.price).toFixed(2)}
                                    </span>
                                </td>
                                <td className="px-6 py-5 text-gray-500 text-sm">{book.publishDate}</td>
                                <td className="px-6 py-5 text-right">
                                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
                        <h3 className="text-lg font-medium text-gray-900">暂无图书</h3>
                        <p className="text-gray-500 mt-1">开始添加您的第一本书吧</p>
                    </div>
                )}
            </div>

            <BookModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                onSuccess={fetchBooks}
                bookToEdit={currentBook}
            />

            <DeleteModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={confirmDelete}
                bookTitle={currentBook?.title}
            />
        </div>
    );
};

export default BookList;
