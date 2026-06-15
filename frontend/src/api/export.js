import request from './request';

const exportApi = {
    createBookExport(data, userId, username) {
        return request.post(`/export/books?userId=${userId}&username=${encodeURIComponent(username)}`, data);
    },

    getTask(taskId) {
        return request.get(`/export/tasks/${taskId}`);
    },

    getTasks(userId) {
        return request.get(`/export/tasks?userId=${userId}`);
    },

    getProgress(taskId) {
        return request.get(`/export/tasks/${taskId}/progress`);
    },

    retryTask(taskId, userId) {
        return request.post(`/export/tasks/${taskId}/retry?userId=${userId}`);
    },

    getDownloadUrl(taskId, userId) {
        return `/api/export/download/${taskId}?userId=${userId}`;
    }
};

export default exportApi;
