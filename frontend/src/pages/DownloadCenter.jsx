import React, { useState, useEffect, useCallback } from 'react';
import exportApi from '../api/export';

const DownloadCenter = ({ user }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pollingTasks, setPollingTasks] = useState(new Set());

    const fetchTasks = useCallback(async () => {
        if (!user?.id) return;
        try {
            const data = await exportApi.getTasks(user.id);
            setTasks(data);

            const inProgress = data
                .filter(t => t.status === 'PENDING' || t.status === 'PROCESSING')
                .map(t => t.id);
            setPollingTasks(new Set(inProgress));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    useEffect(() => {
        if (pollingTasks.size === 0) return;

        const interval = setInterval(async () => {
            const taskIds = Array.from(pollingTasks);
            const updatedTasks = [...tasks];

            for (const taskId of taskIds) {
                try {
                    const progress = await exportApi.getProgress(taskId);
                    const index = updatedTasks.findIndex(t => t.id === taskId);
                    if (index !== -1) {
                        updatedTasks[index] = {
                            ...updatedTasks[index],
                            status: progress.status,
                            progress: progress.progress,
                            processedRows: progress.processedRows,
                            totalRows: progress.totalRows,
                            errorMessage: progress.errorMessage
                        };
                    }
                } catch (e) {
                    console.error(e);
                }
            }

            setTasks(updatedTasks);

            const stillInProgress = updatedTasks
                .filter(t => t.status === 'PENDING' || t.status === 'PROCESSING')
                .map(t => t.id);
            setPollingTasks(new Set(stillInProgress));
        }, 2000);

        return () => clearInterval(interval);
    }, [pollingTasks, tasks]);

    const handleRetry = async (taskId) => {
        try {
            await exportApi.retryTask(taskId, user.id);
            fetchTasks();
        } catch (e) {
            alert(e.message || '重试失败');
        }
    };

    const handleDownload = (taskId, fileName) => {
        const url = exportApi.getDownloadUrl(taskId, user.id);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'export';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const getStatusInfo = (status) => {
        const map = {
            PENDING: { label: '排队中', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
            PROCESSING: { label: '导出中', color: 'bg-blue-100 text-blue-700', icon: '⏳' },
            SUCCESS: { label: '已完成', color: 'bg-green-100 text-green-700', icon: '✓' },
            FAILED: { label: '失败', color: 'bg-red-100 text-red-700', icon: '✕' }
        };
        return map[status] || { label: status, color: 'bg-gray-100 text-gray-700', icon: '?' };
    };

    const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateStr) => {
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

    return (
        <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-extrabold text-gray-800">下载中心</h2>
                            <p className="text-gray-500 text-sm mt-1">管理您的数据导出任务</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="text-center py-16 text-gray-400">加载中...</div>
                    ) : tasks.length === 0 ? (
                        <div className="text-center py-24">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">暂无导出任务</h3>
                            <p className="text-gray-500 mt-1">在图书列表中点击导出按钮开始导出数据</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                                    <th className="px-6 py-4 border-b border-gray-100">任务名称</th>
                                    <th className="px-6 py-4 border-b border-gray-100">格式</th>
                                    <th className="px-6 py-4 border-b border-gray-100">状态</th>
                                    <th className="px-6 py-4 border-b border-gray-100">进度</th>
                                    <th className="px-6 py-4 border-b border-gray-100">文件大小</th>
                                    <th className="px-6 py-4 border-b border-gray-100">创建时间</th>
                                    <th className="px-6 py-4 border-b border-gray-100 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {tasks.map((task) => {
                                    const statusInfo = getStatusInfo(task.status);
                                    const isInProgress = task.status === 'PENDING' || task.status === 'PROCESSING';
                                    return (
                                        <tr key={task.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{task.taskName}</div>
                                                {task.errorMessage && (
                                                    <div className="text-xs text-red-500 mt-1 truncate max-w-xs">
                                                        错误：{task.errorMessage}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-100 text-purple-700">
                                                    {task.fileFormat}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${statusInfo.color}`}>
                                                    <span className="mr-1">{statusInfo.icon}</span>
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 w-48">
                                                {isInProgress ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                                                style={{ width: `${task.progress || 0}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-gray-500 font-medium w-12">
                                                            {task.progress || 0}%
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-500">
                                                        {task.totalRows || 0} 条
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {task.status === 'SUCCESS' ? formatFileSize(task.fileSize) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {formatDate(task.createdAt)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {task.status === 'SUCCESS' && (
                                                        <button
                                                            onClick={() => handleDownload(task.id, task.fileName)}
                                                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                            </svg>
                                                            下载
                                                        </button>
                                                    )}
                                                    {task.status === 'FAILED' && (
                                                        <button
                                                            onClick={() => handleRetry(task.id)}
                                                            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                            </svg>
                                                            重试
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DownloadCenter;
