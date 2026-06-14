import request from './request';

export const loadLayout = () => {
    return request.get('/shelf-layout');
};

export const saveLayout = (layout) => {
    return request.post('/shelf-layout', layout);
};

export const checkCapacity = (layerId, addCount = 1) => {
    return request.get(`/shelf-layout/capacity/${layerId}?addCount=${addCount}`);
};

export const getUnplacedBooks = () => {
    return request.get('/shelf-layout/unplaced-books');
};

export const createBookshelf = (shelf) => {
    return request.post('/shelf-layout/bookshelves', shelf);
};

export const updateBookshelf = (shelf) => {
    return request.put('/shelf-layout/bookshelves', shelf);
};

export const deleteBookshelf = (id) => {
    return request.delete(`/shelf-layout/bookshelves/${id}`);
};

export const addLayer = (shelfId) => {
    return request.post(`/shelf-layout/bookshelves/${shelfId}/layers`);
};

export const updateLayer = (layer) => {
    return request.put('/shelf-layout/layers', layer);
};

export const removeLayer = (layerId) => {
    return request.delete(`/shelf-layout/layers/${layerId}`);
};

export const placeBook = (bookId, layerId, positionIndex) => {
    const params = new URLSearchParams();
    params.append('bookId', bookId);
    params.append('layerId', layerId);
    if (positionIndex !== undefined && positionIndex !== null) {
        params.append('positionIndex', positionIndex);
    }
    return request.post(`/shelf-layout/place?${params.toString()}`);
};

export const removeBookFromShelf = (bookId) => {
    return request.delete(`/shelf-layout/place/book/${bookId}`);
};

export const batchMoveBooks = (bookIds, targetLayerId, startPosition) => {
    return request.post('/shelf-layout/batch-move', {
        bookIds,
        targetLayerId,
        startPosition
    });
};
