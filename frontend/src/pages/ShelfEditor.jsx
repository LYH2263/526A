import React, { useState, useEffect, useRef, useCallback } from 'react';
import request from '../api/request';
import {
    loadLayout,
    saveLayout,
    getUnplacedBooks,
    createBookshelf,
    updateBookshelf,
    placeBook,
    removeBookFromShelf,
    batchMoveBooks,
    checkCapacity
} from '../api/shelfLayout';

const BOOK_WIDTH = 30;
const BOOK_HEIGHT = 50;
const BOOK_GAP = 2;
const SHELF_PADDING = 10;
const SHELF_HEADER_HEIGHT = 30;
const LAYER_THICKNESS = 8;

const ShelfEditor = () => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [layout, setLayout] = useState(null);
    const [unplacedBooks, setUnplacedBooks] = useState([]);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [dragState, setDragState] = useState(null);
    const [selectionBox, setSelectionBox] = useState(null);
    const [selectedBookIds, setSelectedBookIds] = useState(new Set());
    const [hoverLayer, setHoverLayer] = useState(null);
    const [warningLayers, setWarningLayers] = useState(new Set());
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectStart, setSelectStart] = useState(null);
    const [isDirty, setIsDirty] = useState(false);
    const [message, setMessage] = useState(null);
    const [shelfDrag, setShelfDrag] = useState(null);
    const [hoveredShelfId, setHoveredShelfId] = useState(null);

    const showMessage = (msg, type = 'info') => {
        setMessage({ text: msg, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const fetchData = useCallback(async () => {
        try {
            const [layoutData, booksData] = await Promise.all([
                loadLayout(),
                getUnplacedBooks()
            ]);
            setLayout(layoutData);
            setUnplacedBooks(booksData);
        } catch (e) {
            console.error(e);
            showMessage('加载数据失败', 'error');
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const screenToWorld = (screenX, screenY) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: (screenX - rect.left - offset.x) / scale,
            y: (screenY - rect.top - offset.y) / scale
        };
    };

    const getLayerBounds = (shelf, layer, layerIndex) => {
        const x = shelf.positionX + SHELF_PADDING;
        const totalHeaderHeight = SHELF_HEADER_HEIGHT;
        let yOffset = totalHeaderHeight;
        for (let i = 0; i < layerIndex; i++) {
            yOffset += (shelf.layers[i]?.height || 60) + LAYER_THICKNESS;
        }
        const y = shelf.positionY + yOffset;
        const width = shelf.width - SHELF_PADDING * 2;
        const height = layer.height || 60;
        return { x, y, width, height };
    };

    const getShelfBounds = (shelf) => {
        const totalLayerHeight = (shelf.layers || []).reduce((sum, l) => sum + (l.height || 60) + LAYER_THICKNESS, 0);
        return {
            x: shelf.positionX,
            y: shelf.positionY,
            width: shelf.width,
            height: SHELF_HEADER_HEIGHT + totalLayerHeight + 10
        };
    };

    const getBookPosition = (shelf, layer, layerIndex, positionIndex) => {
        const bounds = getLayerBounds(shelf, layer, layerIndex);
        return {
            x: bounds.x + positionIndex * (BOOK_WIDTH + BOOK_GAP),
            y: bounds.y + (bounds.height - BOOK_HEIGHT) / 2,
            width: BOOK_WIDTH,
            height: BOOK_HEIGHT
        };
    };

    const hitTestLayer = (worldX, worldY) => {
        if (!layout?.bookshelves) return null;
        for (const shelf of layout.bookshelves) {
            const shelfBounds = getShelfBounds(shelf);
            if (worldX >= shelfBounds.x && worldX <= shelfBounds.x + shelfBounds.width &&
                worldY >= shelfBounds.y && worldY <= shelfBounds.y + shelfBounds.height) {
                for (let i = 0; i < (shelf.layers || []).length; i++) {
                    const layer = shelf.layers[i];
                    const bounds = getLayerBounds(shelf, layer, i);
                    if (worldX >= bounds.x && worldX <= bounds.x + bounds.width &&
                        worldY >= bounds.y - 5 && worldY <= bounds.y + bounds.height + 5) {
                        return { shelf, layer, layerIndex: i, bounds };
                    }
                }
            }
        }
        return null;
    };

    const hitTestBook = (worldX, worldY) => {
        if (!layout?.bookshelves) return null;
        for (const shelf of layout.bookshelves) {
            for (let i = 0; i < (shelf.layers || []).length; i++) {
                const layer = shelf.layers[i];
                const placements = layer.placements || [];
                for (let j = 0; j < placements.length; j++) {
                    const pos = getBookPosition(shelf, layer, i, j);
                    if (worldX >= pos.x && worldX <= pos.x + pos.width &&
                        worldY >= pos.y && worldY <= pos.y + pos.height) {
                        return { shelf, layer, layerIndex: i, placement: placements[j], positionIndex: j, pos };
                    }
                }
            }
        }
        return null;
    };

    const hitTestShelfHeader = (worldX, worldY) => {
        if (!layout?.bookshelves) return null;
        for (const shelf of layout.bookshelves) {
            const headerX = shelf.positionX;
            const headerY = shelf.positionY;
            const headerWidth = shelf.width;
            const headerHeight = SHELF_HEADER_HEIGHT;
            if (worldX >= headerX && worldX <= headerX + headerWidth &&
                worldY >= headerY && worldY <= headerY + headerHeight) {
                return {
                    shelf,
                    offsetX: worldX - shelf.positionX,
                    offsetY: worldY - shelf.positionY
                };
            }
        }
        return null;
    };

    const getMaxBooksInLayer = (layer) => {
        return layer.capacity || 10;
    };

    const handleCanvasMouseDown = (e) => {
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            setIsPanning(true);
            setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
            return;
        }

        if (e.button === 0 && !dragState && !shelfDrag) {
            const world = screenToWorld(e.clientX, e.clientY);
            const hitShelfHeader = hitTestShelfHeader(world.x, world.y);

            if (hitShelfHeader && !e.shiftKey) {
                setShelfDrag({
                    shelfId: hitShelfHeader.shelf.id,
                    offsetX: hitShelfHeader.offsetX,
                    offsetY: hitShelfHeader.offsetY,
                    currentX: world.x,
                    currentY: world.y
                });
                setSelectedBookIds(new Set());
                return;
            }

            const hitBook = hitTestBook(world.x, world.y);

            if (hitBook) {
                if (!selectedBookIds.has(hitBook.placement.bookId)) {
                    if (!e.shiftKey) {
                        setSelectedBookIds(new Set([hitBook.placement.bookId]));
                    } else {
                        setSelectedBookIds(prev => new Set([...prev, hitBook.placement.bookId]));
                    }
                }

                const booksToDrag = selectedBookIds.has(hitBook.placement.bookId) && selectedBookIds.size > 1
                    ? Array.from(selectedBookIds)
                    : [hitBook.placement.bookId];

                setDragState({
                    type: 'shelf-book',
                    bookIds: booksToDrag,
                    startX: world.x,
                    startY: world.y,
                    offsetX: world.x - hitBook.pos.x,
                    offsetY: world.y - hitBook.pos.y,
                    currentX: world.x,
                    currentY: world.y,
                    sourceLayerId: hitBook.layer.id
                });
            } else if (e.shiftKey) {
                setIsSelecting(true);
                setSelectStart({ x: world.x, y: world.y });
                setSelectionBox({ x1: world.x, y1: world.y, x2: world.x, y2: world.y });
            } else {
                setSelectedBookIds(new Set());
                setIsSelecting(true);
                setSelectStart({ x: world.x, y: world.y });
                setSelectionBox({ x1: world.x, y1: world.y, x2: world.x, y2: world.y });
            }
        }
    };

    const handleCanvasMouseMove = (e) => {
        const world = screenToWorld(e.clientX, e.clientY);

        if (isPanning) {
            setOffset({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            });
            return;
        }

        if (shelfDrag) {
            const newX = world.x - shelfDrag.offsetX;
            const newY = world.y - shelfDrag.offsetY;
            setShelfDrag(prev => ({ ...prev, currentX: newX, currentY: newY }));
            setLayout(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    bookshelves: prev.bookshelves.map(s => {
                        if (s.id === shelfDrag.shelfId) {
                            return { ...s, positionX: newX, positionY: newY };
                        }
                        return s;
                    })
                };
            });
            return;
        }

        if (dragState) {
            setDragState(prev => ({
                ...prev,
                currentX: world.x,
                currentY: world.y
            }));

            const hit = hitTestLayer(world.x, world.y);
            if (hit) {
                setHoverLayer(hit.layer.id);
                const targetLayerId = hit.layer.id;
                const sourceLayerId = dragState.sourceLayerId;
                const booksCount = dragState.bookIds.length;

                let booksInTarget = 0;
                if (sourceLayerId && targetLayerId === sourceLayerId) {
                    if (layout?.bookshelves) {
                        for (const shelf of layout.bookshelves) {
                            for (const layer of (shelf.layers || [])) {
                                if (layer.id === targetLayerId) {
                                    booksInTarget = (layer.placements || []).filter(p =>
                                        dragState.bookIds.includes(p.bookId)
                                    ).length;
                                }
                            }
                        }
                    }
                }
                const netAddCount = booksCount - booksInTarget;

                if (netAddCount <= 0) {
                    setWarningLayers(prev => {
                        const next = new Set(prev);
                        next.delete(targetLayerId);
                        return next;
                    });
                } else {
                    checkCapacity(targetLayerId, netAddCount).then(cap => {
                        if (!cap.valid) {
                            setWarningLayers(prev => new Set([...prev, targetLayerId]));
                        } else {
                            setWarningLayers(prev => {
                                const next = new Set(prev);
                                next.delete(targetLayerId);
                                return next;
                            });
                        }
                    });
                }
            } else {
                setHoverLayer(null);
                setWarningLayers(new Set());
            }
            return;
        }

        if (isSelecting && selectStart) {
            setSelectionBox({
                x1: selectStart.x,
                y1: selectStart.y,
                x2: world.x,
                y2: world.y
            });
        }

        const hoverShelfHeader = hitTestShelfHeader(world.x, world.y);
        setHoveredShelfId(hoverShelfHeader ? hoverShelfHeader.shelf.id : null);

        const hover = hitTestLayer(world.x, world.y);
        setHoverLayer(hover ? hover.layer.id : null);
    };

    const handleCanvasMouseUp = async (e) => {
        if (isPanning) {
            setIsPanning(false);
            return;
        }

        if (shelfDrag) {
            try {
                const targetShelf = layout?.bookshelves?.find(s => s.id === shelfDrag.shelfId);
                if (targetShelf) {
                    await updateBookshelf(targetShelf);
                    setIsDirty(true);
                }
            } catch (err) {
                showMessage('更新书架位置失败', 'error');
            }
            setShelfDrag(null);
            return;
        }

        if (dragState) {
            const world = screenToWorld(e.clientX, e.clientY);
            const hit = hitTestLayer(world.x, world.y);

            if (hit && dragState.bookIds.length > 0) {
                try {
                    const bounds = hit.bounds;
                    const relativeX = world.x - bounds.x;
                    let targetPosition = Math.floor(relativeX / (BOOK_WIDTH + BOOK_GAP));
                    targetPosition = Math.max(0, Math.min(targetPosition, (hit.layer.placements || []).length));

                    if (dragState.bookIds.length === 1) {
                        await placeBook(dragState.bookIds[0], hit.layer.id, targetPosition);
                    } else {
                        await batchMoveBooks(dragState.bookIds, hit.layer.id, targetPosition);
                    }
                    setIsDirty(true);
                    showMessage(dragState.bookIds.length > 1 ? `已移动 ${dragState.bookIds.length} 本书` : '移动成功', 'success');
                    await fetchData();
                } catch (err) {
                    showMessage(err.message || '移动失败', 'error');
                }
            }

            setDragState(null);
            setHoverLayer(null);
            setWarningLayers(new Set());
            return;
        }

        if (isSelecting && selectionBox) {
            const minX = Math.min(selectionBox.x1, selectionBox.x2);
            const maxX = Math.max(selectionBox.x1, selectionBox.x2);
            const minY = Math.min(selectionBox.y1, selectionBox.y2);
            const maxY = Math.max(selectionBox.y1, selectionBox.y2);

            const newSelected = new Set();
            if (layout?.bookshelves) {
                for (const shelf of layout.bookshelves) {
                    for (let i = 0; i < (shelf.layers || []).length; i++) {
                        const layer = shelf.layers[i];
                        const placements = layer.placements || [];
                        for (let j = 0; j < placements.length; j++) {
                            const pos = getBookPosition(shelf, layer, i, j);
                            if (pos.x >= minX && pos.x + pos.width <= maxX &&
                                pos.y >= minY && pos.y + pos.height <= maxY) {
                                newSelected.add(placements[j].bookId);
                            }
                        }
                    }
                }
            }
            setSelectedBookIds(newSelected);
            setIsSelecting(false);
            setSelectionBox(null);
            setSelectStart(null);
        }
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.3, Math.min(3, scale * delta));
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        setOffset({
            x: mouseX - (mouseX - offset.x) * (newScale / scale),
            y: mouseY - (mouseY - offset.y) * (newScale / scale)
        });
        setScale(newScale);
    };

    const handleBookPanelDragStart = (e, book) => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', JSON.stringify({ bookId: book.id }));
        setDragState({
            type: 'panel-book',
            bookIds: [book.id],
            bookTitle: book.title,
            currentX: 0,
            currentY: 0
        });
    };

    const handleCanvasDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        const world = screenToWorld(e.clientX, e.clientY);
        const hit = hitTestLayer(world.x, world.y);
        if (hit) {
            setHoverLayer(hit.layer.id);
        } else {
            setHoverLayer(null);
        }
    };

    const handleCanvasDrop = async (e) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            const world = screenToWorld(e.clientX, e.clientY);
            const hit = hitTestLayer(world.x, world.y);

            if (hit && data.bookId) {
                const bounds = hit.bounds;
                const relativeX = world.x - bounds.x;
                let targetPosition = Math.floor(relativeX / (BOOK_WIDTH + BOOK_GAP));
                targetPosition = Math.max(0, Math.min(targetPosition, (hit.layer.placements || []).length));

                await placeBook(data.bookId, hit.layer.id, targetPosition);
                setIsDirty(true);
                showMessage('放置成功', 'success');
                await fetchData();
            }
        } catch (err) {
            showMessage(err.message || '放置失败', 'error');
        }
        setDragState(null);
        setHoverLayer(null);
    };

    const handleCanvasDragLeave = () => {
        setHoverLayer(null);
    };

    const handleAddShelf = async () => {
        const name = prompt('请输入书架名称：', '新书架');
        if (!name) return;

        const existingShelves = layout?.bookshelves || [];
        const shelfWidth = 400;
        const shelfHeightApprox = 380;
        const gap = 60;

        let newX = 50;
        let newY = 50;
        let found = false;

        for (let row = 0; row < 10 && !found; row++) {
            for (let col = 0; col < 10 && !found; col++) {
                const candidateX = 50 + col * (shelfWidth + gap);
                const candidateY = 50 + row * (shelfHeightApprox + gap);

                let overlaps = false;
                for (const shelf of existingShelves) {
                    const sWidth = shelf.width || 400;
                    const sHeight = shelfHeightApprox;
                    if (candidateX < shelf.positionX + sWidth + gap &&
                        candidateX + shelfWidth + gap > shelf.positionX &&
                        candidateY < shelf.positionY + sHeight + gap &&
                        candidateY + shelfHeightApprox + gap > shelf.positionY) {
                        overlaps = true;
                        break;
                    }
                }

                if (!overlaps) {
                    newX = candidateX;
                    newY = candidateY;
                    found = true;
                }
            }
        }

        if (!found) {
            newX = 50 + existingShelves.length * 30;
            newY = 50 + existingShelves.length * 30;
        }

        try {
            await createBookshelf({
                name,
                positionX: newX,
                positionY: newY,
                width: shelfWidth,
                sortOrder: existingShelves.length
            });
            setIsDirty(true);
            showMessage('书架创建成功（可拖动标题栏移动位置）', 'success');
            await fetchData();
        } catch (err) {
            showMessage('创建书架失败', 'error');
        }
    };

    const handleSaveLayout = async () => {
        try {
            await saveLayout(layout);
            setIsDirty(false);
            showMessage('布局保存成功', 'success');
        } catch (err) {
            showMessage('保存失败', 'error');
        }
    };

    const handleResetView = () => {
        setScale(1);
        setOffset({ x: 0, y: 0 });
    };

    const handleRemoveSelected = async () => {
        if (selectedBookIds.size === 0) return;
        if (!confirm(`确定要将选中的 ${selectedBookIds.size} 本书从书架上移除吗？`)) return;
        try {
            for (const bookId of selectedBookIds) {
                await removeBookFromShelf(bookId);
            }
            setSelectedBookIds(new Set());
            setIsDirty(true);
            showMessage('已从书架移除', 'success');
            await fetchData();
        } catch (err) {
            showMessage('移除失败', 'error');
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, rect.width, rect.height);

        ctx.save();
        ctx.translate(offset.x, offset.y);
        ctx.scale(scale, scale);

        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-10000, -10000, 20000, 20000);

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1 / scale;
        const gridSize = 50;
        const startX = Math.floor(-offset.x / scale / gridSize) * gridSize - gridSize;
        const startY = Math.floor(-offset.y / scale / gridSize) * gridSize - gridSize;
        for (let x = startX; x < startX + rect.width / scale + gridSize * 2; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, startY + rect.height / scale + gridSize * 2);
            ctx.stroke();
        }
        for (let y = startY; y < startY + rect.height / scale + gridSize * 2; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(startX + rect.width / scale + gridSize * 2, y);
            ctx.stroke();
        }

        if (layout?.bookshelves) {
            for (const shelf of layout.bookshelves) {
                const shelfBounds = getShelfBounds(shelf);
                const isDraggingShelf = shelfDrag?.shelfId === shelf.id;
                const isHeaderHovered = hoveredShelfId === shelf.id;

                if (isDraggingShelf) {
                    ctx.globalAlpha = 0.85;
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                    ctx.shadowBlur = 15 / scale;
                    ctx.shadowOffsetX = 5 / scale;
                    ctx.shadowOffsetY = 5 / scale;
                }

                ctx.fillStyle = '#78350f';
                ctx.fillRect(shelfBounds.x, shelfBounds.y, shelfBounds.width, shelfBounds.height);

                if (isHeaderHovered && !isDraggingShelf) {
                    ctx.fillStyle = '#b45309';
                } else {
                    ctx.fillStyle = '#92400e';
                }
                ctx.fillRect(shelfBounds.x, shelfBounds.y, shelfBounds.width, SHELF_HEADER_HEIGHT);

                ctx.fillStyle = '#fef3c7';
                ctx.font = 'bold 14px sans-serif';
                ctx.textBaseline = 'middle';
                ctx.fillText(shelf.name, shelfBounds.x + 15, shelfBounds.y + SHELF_HEADER_HEIGHT / 2);

                if (isHeaderHovered || isDraggingShelf) {
                    ctx.fillStyle = 'rgba(254, 243, 199, 0.7)';
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'right';
                    const handleText = isDraggingShelf ? '拖动中...' : '↔ 拖动移动';
                    ctx.fillText(handleText, shelfBounds.x + shelfBounds.width - 10, shelfBounds.y + SHELF_HEADER_HEIGHT / 2);
                }

                if (isDraggingShelf) {
                    ctx.globalAlpha = 1;
                    ctx.shadowColor = 'transparent';
                    ctx.shadowBlur = 0;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
                }

                for (let i = 0; i < (shelf.layers || []).length; i++) {
                    const layer = shelf.layers[i];
                    const bounds = getLayerBounds(shelf, layer, i);
                    const isHovered = hoverLayer === layer.id;
                    const hasWarning = warningLayers.has(layer.id);
                    const currentCount = (layer.placements || []).length;
                    const isOverCapacity = currentCount >= (layer.capacity || 10);

                    if (isHovered) {
                        ctx.fillStyle = hasWarning ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.15)';
                        ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
                        ctx.strokeStyle = hasWarning ? '#ef4444' : '#3b82f6';
                        ctx.lineWidth = 2 / scale;
                        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
                    } else if (isOverCapacity) {
                        ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
                        ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
                    } else {
                        ctx.fillStyle = '#fef3c7';
                        ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
                    }

                    ctx.fillStyle = '#78350f';
                    ctx.fillRect(bounds.x - 2, bounds.y + bounds.height, bounds.width + 4, LAYER_THICKNESS);

                    const placements = layer.placements || [];
                    for (let j = 0; j < placements.length; j++) {
                        const placement = placements[j];
                        const pos = getBookPosition(shelf, layer, i, j);
                        const isSelected = selectedBookIds.has(placement.bookId);
                        const isDragging = dragState?.bookIds?.includes(placement.bookId);

                        if (!isDragging) {
                            const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#6366f1'];
                            const colorIdx = placement.bookId ? placement.bookId % colors.length : 0;

                            ctx.fillStyle = colors[colorIdx];
                            ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

                            if (isSelected) {
                                ctx.strokeStyle = '#fbbf24';
                                ctx.lineWidth = 3 / scale;
                                ctx.strokeRect(pos.x - 1, pos.y - 1, pos.width + 2, pos.height + 2);
                            }

                            if (placement.book) {
                                ctx.save();
                                ctx.translate(pos.x + pos.width / 2, pos.y + pos.height / 2);
                                ctx.rotate(-Math.PI / 2);
                                ctx.fillStyle = '#ffffff';
                                ctx.font = '10px sans-serif';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                const title = placement.book.title || '未知';
                                ctx.fillText(title.length > 6 ? title.substring(0, 6) + '…' : title, 0, 0);
                                ctx.restore();
                            }
                        }
                    }

                    ctx.fillStyle = isOverCapacity ? '#ef4444' : '#92400e';
                    ctx.font = '11px sans-serif';
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'top';
                    ctx.fillText(`${currentCount}/${layer.capacity || 10}`, bounds.x + bounds.width - 5, bounds.y + 2);
                }
            }
        }

        if (dragState && dragState.currentX !== undefined) {
            const bookCount = dragState.bookIds.length;
            for (let i = 0; i < Math.min(bookCount, 5); i++) {
                const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
                ctx.globalAlpha = 0.7;
                ctx.fillStyle = colors[i % colors.length];
                ctx.fillRect(
                    dragState.currentX - (dragState.offsetX || BOOK_WIDTH / 2) + i * 5,
                    dragState.currentY - (dragState.offsetY || BOOK_HEIGHT / 2),
                    BOOK_WIDTH,
                    BOOK_HEIGHT
                );
            }
            ctx.globalAlpha = 1;
            if (bookCount > 5) {
                ctx.fillStyle = '#1f2937';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`+${bookCount - 5}`, dragState.currentX + 25, dragState.currentY - BOOK_HEIGHT / 2 - 5);
            }
        }

        if (selectionBox) {
            const x = Math.min(selectionBox.x1, selectionBox.x2);
            const y = Math.min(selectionBox.y1, selectionBox.y2);
            const w = Math.abs(selectionBox.x2 - selectionBox.x1);
            const h = Math.abs(selectionBox.y2 - selectionBox.y1);
            ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1 / scale;
            ctx.setLineDash([4 / scale, 4 / scale]);
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);
        }

        ctx.restore();
    }, [layout, scale, offset, dragState, selectionBox, selectedBookIds, hoverLayer, warningLayers]);

    return (
        <div className="h-full flex flex-col bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-gray-800">📚 书架陈列编辑器</h2>
                    <span className="text-sm text-gray-500">
                        缩放: {Math.round(scale * 100)}% | 已选: {selectedBookIds.size} 本
                    </span>
                    {isDirty && (
                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                            有未保存的更改
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleAddShelf}
                        className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        + 新建书架
                    </button>
                    <button
                        onClick={handleRemoveSelected}
                        disabled={selectedBookIds.size === 0}
                        className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        从书架移除
                    </button>
                    <button
                        onClick={handleResetView}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        重置视图
                    </button>
                    <button
                        onClick={handleSaveLayout}
                        className="px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                    >
                        💾 保存布局
                    </button>
                </div>
            </div>

            {message && (
                <div className={`absolute top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${
                    message.type === 'error' ? 'bg-red-500 text-white' :
                    message.type === 'success' ? 'bg-green-500 text-white' :
                    'bg-blue-500 text-white'
                }`}>
                    {message.text}
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                <div
                    ref={containerRef}
                    className="flex-1 relative overflow-hidden"
                    onWheel={handleWheel}
                >
                    <canvas
                        ref={canvasRef}
                        className="w-full h-full cursor-crosshair"
                        style={{
                            cursor: isPanning ? 'grabbing'
                                : shelfDrag ? 'grabbing'
                                : dragState ? 'grabbing'
                                : hoveredShelfId ? 'grab'
                                : 'crosshair'
                        }}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                        onDragOver={handleCanvasDragOver}
                        onDrop={handleCanvasDrop}
                        onDragLeave={handleCanvasDragLeave}
                    />
                    <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow text-xs text-gray-600 space-y-1">
                        <div>🖱️ 滚轮：缩放画布</div>
                        <div>🖱️ Alt+拖拽 / 中键：平移画布</div>
                        <div>📌 拖动书架标题栏：移动书架位置</div>
                        <div>🖱️ Shift+拖拽：框选多本</div>
                        <div>📖 从右侧拖拽图书到格层</div>
                    </div>
                </div>

                <div className="w-72 bg-white border-l border-gray-200 flex flex-col">
                    <div className="px-4 py-3 border-b border-gray-200">
                        <h3 className="font-bold text-gray-800">📚 待上架图书</h3>
                        <p className="text-xs text-gray-500 mt-1">共 {unplacedBooks.length} 本未上架</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3">
                        <div className="grid grid-cols-2 gap-2">
                            {unplacedBooks.map(book => {
                                const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#6366f1'];
                                const colorIdx = book.id % colors.length;
                                return (
                                    <div
                                        key={book.id}
                                        draggable
                                        onDragStart={(e) => handleBookPanelDragStart(e, book)}
                                        className="group p-2 border border-gray-200 rounded-lg cursor-grab hover:border-blue-400 hover:shadow-md transition-all active:cursor-grabbing"
                                    >
                                        <div
                                            className="w-full h-14 rounded mb-2 flex items-center justify-center text-white text-xs font-bold"
                                            style={{ backgroundColor: colors[colorIdx] }}
                                        >
                                            {book.title.charAt(0)}
                                        </div>
                                        <div className="text-xs font-medium text-gray-800 truncate" title={book.title}>
                                            {book.title}
                                        </div>
                                        <div className="text-[10px] text-gray-500 truncate" title={book.author}>
                                            {book.author}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {unplacedBooks.length === 0 && (
                            <div className="text-center py-12 text-gray-400 text-sm">
                                <div className="text-4xl mb-2">✅</div>
                                所有图书都已上架
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShelfEditor;
