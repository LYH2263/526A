import request from './request';

export function detectDuplicates(threshold = 0.6) {
    return request.get('/duplicates/detect', { params: { threshold } });
}

export function previewMerge(primaryBookId, duplicateBookIds) {
    return request.post('/duplicates/merge/preview', {
        primaryBookId,
        duplicateBookIds
    });
}

export function mergeDuplicates(primaryBookId, duplicateBookIds) {
    return request.post('/duplicates/merge', {
        primaryBookId,
        duplicateBookIds
    });
}
