import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getNotifications, getUnreadCount, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, clearReadNotifications } from '../api/notification';

const NotificationDropdown = ({ onNavigateToBook }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    const PAGE_SIZE = 5;

    const fetchUnreadCount = useCallback(async () => {
        try {
            const count = await getUnreadCount();
            setUnreadCount(count);
        } catch (e) {
            console.error(e);
        }
    }, []);

    const fetchNotifications = useCallback(async (pageNum = 1) => {
        setLoading(true);
        try {
            const data = await getNotifications(pageNum, PAGE_SIZE);
            if (pageNum === 1) {
                setNotifications(data.list || []);
            } else {
                setNotifications(prev => [...prev, ...(data.list || [])]);
            }
            setTotal(data.total || 0);
            setPage(pageNum);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        
        const handleStockChanged = () => {
            fetchUnreadCount();
            if (isOpen) {
                fetchNotifications(1);
            }
        };
        window.addEventListener('stock-changed', handleStockChanged);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('stock-changed', handleStockChanged);
        };
    }, [fetchUnreadCount, fetchNotifications, isOpen]);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications(1);
            fetchUnreadCount();
        }
    }, [isOpen, fetchNotifications, fetchUnreadCount]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    const handleMarkAsRead = async (id, e) => {
        e.stopPropagation();
        try {
            await markNotificationAsRead(id);
            setNotifications(prev => prev.map(n => 
                n.id === id ? { ...n, isRead: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (e) {
            console.error(e);
        }
    };

    const handleMarkAllAsRead = async (e) => {
        e.stopPropagation();
        try {
            await markAllNotificationsAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        try {
            const target = notifications.find(n => n.id === id);
            const wasUnread = target && !target.isRead;
            await deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            setTotal(prev => Math.max(0, prev - 1));
            if (wasUnread) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleClearRead = async (e) => {
        e.stopPropagation();
        try {
            await clearReadNotifications();
            setNotifications(prev => prev.filter(n => !n.isRead));
            setTotal(prev => prev - (notifications.filter(n => n.isRead).length));
            fetchNotifications(1);
        } catch (e) {
            console.error(e);
        }
    };

    const handleLoadMore = () => {
        if (!loading && notifications.length < total) {
            fetchNotifications(page + 1);
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.isRead) {
            handleMarkAsRead(notification.id, { stopPropagation: () => {} });
        }
        if (notification.bookId && onNavigateToBook) {
            onNavigateToBook(notification.bookId);
            setIsOpen(false);
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 7) return `${days}天前`;
        
        return date.toLocaleDateString();
    };

    const isLowStock = (type) => type === 'LOW_STOCK';

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleToggle}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="通知"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-800">通知中心</h3>
                        <div className="flex items-center gap-3">
                            {notifications.some(n => n.isRead) && (
                                <button
                                    onClick={handleClearRead}
                                    className="text-xs text-gray-500 hover:text-red-600 font-medium"
                                    title="清空已读通知"
                                >
                                    清空已读
                                </button>
                            )}
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    全部已读
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 && !loading ? (
                            <div className="py-12 text-center">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </div>
                                <p className="text-sm text-gray-400">暂无通知</p>
                            </div>
                        ) : (
                            <>
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50 ${
                                            !notification.isRead ? 'bg-blue-50/30' : ''
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                isLowStock(notification.type)
                                                    ? 'bg-orange-100 text-orange-600'
                                                    : 'bg-blue-100 text-blue-600'
                                            }`}>
                                                {isLowStock(notification.type) ? (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className={`text-sm font-medium truncate ${
                                                        isLowStock(notification.type) ? 'text-orange-700' : 'text-gray-800'
                                                    }`}>
                                                        {notification.title}
                                                    </p>
                                                    {!notification.isRead && (
                                                        <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></span>
                                                    )}
                                                </div>
                                                <p 
                                                    className="text-xs text-gray-500 mt-1"
                                                    style={{
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: '2',
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    {notification.content}
                                                </p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-[10px] text-gray-400">
                                                        {formatTime(notification.createdAt)}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        {!notification.isRead && (
                                                            <button
                                                                onClick={(e) => handleMarkAsRead(notification.id, e)}
                                                                className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
                                                            >
                                                                标为已读
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => handleDelete(notification.id, e)}
                                                            className="text-[10px] text-gray-400 hover:text-red-600 font-medium transition-colors"
                                                            title="删除通知"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                {notifications.length < total && (
                                    <div className="px-4 py-3 text-center">
                                        <button
                                            onClick={handleLoadMore}
                                            disabled={loading}
                                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            {loading ? '加载中...' : '加载更多'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
