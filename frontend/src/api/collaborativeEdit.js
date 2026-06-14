import request from './request';

const HEARTBEAT_INTERVAL = 10000;
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8526/ws/book-edit';

class CollaborativeEditService {
    constructor() {
        this.ws = null;
        this.bookId = null;
        this.userId = null;
        this.username = null;
        this.sessionId = null;
        this.heartbeatTimer = null;
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.listeners = {};
        this.onlineEditors = [];
        this.fieldStates = {};
        this.isConnected = false;
    }

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
        return () => {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        };
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    async joinEdit(bookId, userId, username) {
        this.bookId = bookId;
        this.userId = userId;
        this.username = username;

        try {
            const result = await request.post(`/books/edit/${bookId}/join`, null, {
                params: { userId, username }
            });
            this.sessionId = result.sessionId;
            this.onlineEditors = result.onlineEditors || [];
            this.fieldStates = this.arrayToMap(result.fieldStates || [], 'fieldName');

            this.connectWebSocket();
            return result;
        } catch (error) {
            console.error('Failed to join edit:', error);
            throw error;
        }
    }

    async leaveEdit() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.bookId && this.userId && this.sessionId) {
            try {
                await request.post(`/books/edit/${this.bookId}/leave`, null, {
                    params: { userId: this.userId, sessionId: this.sessionId }
                });
            } catch (error) {
                console.error('Failed to leave edit:', error);
            }
        }

        if (this.ws) {
            const ws = this.ws;
            this.ws = null;
            try {
                ws.close();
            } catch (e) {}
        }

        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.emit('disconnected');
    }

    connectWebSocket() {
        if (this.ws) {
            try {
                this.ws.close();
            } catch (e) {}
        }

        try {
            this.ws = new WebSocket(WS_URL);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.emit('connected');
                this.sendJoinMessage();
                this.startHeartbeat();
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (e) {
                    console.error('Failed to parse WebSocket message:', e);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.emit('error', error);
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.isConnected = false;
                this.stopHeartbeat();
                this.emit('disconnected');
                this.tryReconnect();
            };
        } catch (e) {
            console.error('Failed to create WebSocket:', e);
            this.tryReconnect();
        }
    }

    sendJoinMessage() {
        this.sendMessage({
            type: 'join',
            bookId: this.bookId,
            userId: this.userId,
            username: this.username
        });
    }

    sendFieldEdit(fieldName) {
        this.sendMessage({
            type: 'field_edit',
            bookId: this.bookId,
            userId: this.userId,
            username: this.username,
            payload: { fieldName }
        });
    }

    sendFieldEditEnd(fieldName) {
        this.sendMessage({
            type: 'field_edit_end',
            bookId: this.bookId,
            userId: this.userId,
            username: this.username,
            payload: { fieldName }
        });
    }

    sendHeartbeat() {
        this.sendMessage({
            type: 'heartbeat',
            bookId: this.bookId,
            userId: this.userId,
            username: this.username
        });
    }

    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(message));
            } catch (e) {
                console.error('Failed to send WebSocket message:', e);
            }
        }
    }

    handleMessage(message) {
        switch (message.type) {
            case 'join':
                this.onlineEditors = message.payload || [];
                this.emit('editorJoined', { editor: message, onlineEditors: this.onlineEditors });
                break;
            case 'leave':
                this.onlineEditors = message.payload || [];
                this.emit('editorLeft', { editor: message, onlineEditors: this.onlineEditors });
                break;
            case 'online_editors':
                this.onlineEditors = message.payload || [];
                this.emit('onlineEditorsUpdate', this.onlineEditors);
                break;
            case 'field_edit':
                if (message.payload && message.payload.fieldName) {
                    this.fieldStates[message.payload.fieldName] = message.payload;
                    this.emit('fieldEditStart', message.payload);
                }
                break;
            case 'field_edit_end':
                if (message.payload && message.payload.fieldName) {
                    delete this.fieldStates[message.payload.fieldName];
                    this.emit('fieldEditEnd', message.payload);
                }
                break;
            case 'field_states':
                this.fieldStates = this.arrayToMap(message.payload || [], 'fieldName');
                this.emit('fieldStatesUpdate', this.fieldStates);
                break;
            case 'book_updated':
                this.emit('bookUpdated', message.payload);
                break;
            case 'error':
                this.emit('error', message);
                break;
        }
    }

    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected) {
                this.sendHeartbeat();
                this.sendHttpHeartbeat();
            }
        }, HEARTBEAT_INTERVAL);
    }

    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    async sendHttpHeartbeat() {
        if (!this.bookId || !this.userId || !this.sessionId) return;
        try {
            await request.post(`/books/edit/${this.bookId}/heartbeat`, null, {
                params: { userId: this.userId, sessionId: this.sessionId }
            });
        } catch (error) {
            console.error('Heartbeat failed:', error);
        }
    }

    tryReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnect attempts reached');
            this.emit('reconnectFailed');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);

        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

        this.reconnectTimer = setTimeout(() => {
            this.connectWebSocket();
        }, delay);
    }

    arrayToMap(array, keyField) {
        const map = {};
        array.forEach(item => {
            if (item && item[keyField]) {
                map[item[keyField]] = item;
            }
        });
        return map;
    }

    getOnlineEditors() {
        return this.onlineEditors;
    }

    getFieldStates() {
        return this.fieldStates;
    }

    getSessionId() {
        return this.sessionId;
    }

    isFieldLockedByOthers(fieldName) {
        const state = this.fieldStates[fieldName];
        return state && state.editorUserId !== this.userId;
    }

    getFieldEditor(fieldName) {
        return this.fieldStates[fieldName];
    }
}

const instance = new CollaborativeEditService();
export default instance;

export async function submitBookWithVersion(book, userId, username, force = false) {
    return request.post('/books/edit/submit', book, {
        params: { userId, username, force }
    });
}
