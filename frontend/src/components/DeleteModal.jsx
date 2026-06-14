import React from 'react';

const DeleteModal = ({ isOpen, onClose, onConfirm, bookTitle }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 border border-gray-100">
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-50 mb-6">
                        <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                    <h3 className="text-xl leading-6 font-bold text-gray-900 mb-2">确认删除?</h3>
                    <div className="mt-2 text-left bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <p className="text-sm text-gray-500">
                            您即将删除图书：
                            <span className="font-semibold text-gray-800 break-words block mt-1.5 text-base">
                                «{bookTitle}»
                            </span>
                        </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-4">此操作无法撤销，请谨慎操作。</p>
                </div>
                <div className="mt-8 flex justify-center gap-3">
                    <button
                        type="button"
                        className="flex-1 px-4 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                        onClick={onClose}
                    >
                        取消
                    </button>
                    <button
                        type="button"
                        className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium shadow-lg shadow-red-500/30 transition-all transform hover:-translate-y-0.5"
                        onClick={onConfirm}
                    >
                        确认删除
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteModal;
