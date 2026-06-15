import request from './request';

export const getNotifications = (page = 1, size = 10) => {
    return request.get(`/notifications?page=${page}&size=${size}`);
};

export const getUnreadCount = () => {
    return request.get('/notifications/unread-count');
};

export const markNotificationAsRead = (id) => {
    return request.put(`/notifications/${id}/read`);
};

export const markAllNotificationsAsRead = () => {
    return request.put('/notifications/read-all');
};

export const deleteNotification = (id) => {
    return request.delete(`/notifications/${id}`);
};

export const clearReadNotifications = () => {
    return request.delete('/notifications/clear-read');
};

export const adjustBookStock = (bookId, delta) => {
    return request.put(`/books/${bookId}/stock?delta=${delta}`);
};
