import React, { useState, useEffect, useCallback } from 'react';
import request from '../api/request';

const BorrowRecords = ({ user }) => {
    const [records, setRecords] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');

    const fetchRecords = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (statusFilter) {
                params.append('status', statusFilter);
            }
            const url = `/borrow/records${params.toString() ? `?${params.toString()}` : ''}`;
            const data = await request.get(url);
            setRecords(data);
        } catch (e) {
            console.error(e);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const handleReturn = async (record) => {
        if (!window.confirm(`确认归还《${record.bookTitle}》？`)) return;
        try {
            await request.post(`/borrow/return/${record.id}`);
            alert('归还成功！');
            fetchRecords();
        } catch (e) {
            alert(e.message || '归还失败');
        }
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'BORROWED':
                return '在借';
            case 'RETURNED':
                return '已还';
            default:
                return status;
        }
    };

    const getStatusClass = (status, overdue) => {
        if (status === 'RETURNED') {
            return 'bg-gray-100 text-gray-600';
        }
        if (overdue) {
            return 'bg-red-100 text-red-700';
        }
        return 'bg-blue-100 text-blue-700';
    };

    const filterTabs = [
        { key: '', label: '全部' },
        { key: 'BORROWED', label: '在借' },
        { key: 'RETURNED', label: '已还' }
    ];

    const borrowedCount = records.filter(r => r.status === 'BORROWED').length;
    const returnedCount = records.filter(r => r.status === 'RETURNED').length;
    const overdueCount = records.filter(r => r.status === 'BORROWED' && r.overdue).length;

    return (
        <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">在借中</p>
                            <p className="text-2xl font-bold text-blue-600">{borrowedCount}</p>
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
                            <p className="text-gray-500 text-sm">已归还</p>
                            <p className="text-2xl font-bold text-emerald-600">{returnedCount}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">已逾期</p>
                            <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="text-xl font-extrabold text-gray-800 tracking-tight">借阅记录</h2>
                            <p className="text-gray-500 text-sm mt-1">查看所有图书借阅和归还记录</p>
                        </div>
                        <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
                            {filterTabs.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setStatusFilter(tab.key)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                        statusFilter === tab.key
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                                <th className="px-6 py-4 border-b border-gray-100">图书</th>
                                <th className="px-6 py-4 border-b border-gray-100">借阅人</th>
                                <th className="px-6 py-4 border-b border-gray-100">借出时间</th>
                                <th className="px-6 py-4 border-b border-gray-100">应还时间</th>
                                <th className="px-6 py-4 border-b border-gray-100">归还时间</th>
                                <th className="px-6 py-4 border-b border-gray-100">状态</th>
                                <th className="px-6 py-4 border-b border-gray-100 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {records.map((record) => (
                                <tr
                                    key={record.id}
                                    className={`transition-colors ${
                                        record.overdue && record.status === 'BORROWED'
                                            ? 'bg-red-50/50 hover:bg-red-50'
                                            : 'hover:bg-blue-50/30'
                                    }`}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shadow-sm">
                                                {record.bookTitle.charAt(0)}
                                            </div>
                                            <span className="font-medium text-gray-900">{record.bookTitle}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        <span className="inline-flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold">
                                                {record.borrower.charAt(0).toUpperCase()}
                                            </div>
                                            {record.borrower}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">
                                        {formatDateTime(record.borrowTime)}
                                    </td>
                                    <td className={`px-6 py-4 text-sm ${
                                        record.overdue && record.status === 'BORROWED'
                                            ? 'text-red-600 font-medium'
                                            : 'text-gray-500'
                                    }`}>
                                        {formatDateTime(record.dueTime)}
                                        {record.overdue && record.status === 'BORROWED' && (
                                            <span className="ml-2 text-xs text-red-500 font-medium">已逾期</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">
                                        {formatDateTime(record.returnTime)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(record.status, record.overdue)}`}>
                                            {record.overdue && record.status === 'BORROWED' && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse"></span>
                                            )}
                                            {getStatusLabel(record.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {record.status === 'BORROWED' && (
                                            <button
                                                onClick={() => handleReturn(record)}
                                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow"
                                            >
                                                归还
                                            </button>
                                        )}
                                        {record.status === 'RETURNED' && (
                                            <span className="text-gray-400 text-sm">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {records.length === 0 && (
                        <div className="text-center py-20">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">暂无借阅记录</h3>
                            <p className="text-gray-500 mt-1">去图书列表借阅你感兴趣的书吧</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BorrowRecords;
