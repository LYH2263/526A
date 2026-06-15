INSERT IGNORE INTO book (id, title, author, price, publish_date, description, total_stock, available_stock, warn_threshold) VALUES 
(1, '三体', '刘慈欣', 39.00, '2008-01-01', '中国科幻基石', 5, 5, 2),
(2, '活着', '余华', 25.00, '1998-05-01', '讲述了人如何去承受巨大的苦难', 3, 3, 1),
(3, '百年孤独', '加西亚·马尔克斯', 45.00, '2011-06-01', '拉丁美洲魔幻现实主义文学的代表作', 2, 2, 1);

INSERT IGNORE INTO category (id, name, parent_id, sort_order) VALUES
(1, '文学', NULL, 0),
(2, '小说', 1, 0),
(3, '科幻', 2, 0),
(4, '现实主义', 2, 1),
(5, '科技', NULL, 1);

UPDATE book SET category_id = 3 WHERE id = 1;
UPDATE book SET category_id = 4 WHERE id = 2;
UPDATE book SET category_id = 4 WHERE id = 3;

INSERT IGNORE INTO tag (id, name, color) VALUES
(1, '科幻', '#8B5CF6'),
(2, '经典', '#EF4444'),
(3, '获奖', '#F59E0B'),
(4, '必读', '#10B981'),
(5, '绝版', '#6366F1');

INSERT IGNORE INTO book_tag (book_id, tag_id) VALUES
(1, 1),
(1, 3),
(2, 2),
(2, 4),
(3, 2),
(3, 5);

INSERT IGNORE INTO users (id, username, password) VALUES 
(1, 'admin', '123456'),
(2, 'test1', '123456'),
(3, 'test2', '123456');

INSERT IGNORE INTO bookshelf (id, name, position_x, position_y, width, sort_order) VALUES
(1, '文学类书架', 50, 50, 450, 0),
(2, '科技类书架', 550, 50, 450, 1);

INSERT IGNORE INTO shelf_layer (id, bookshelf_id, layer_index, capacity, height) VALUES
(1, 1, 0, 10, 60),
(2, 1, 1, 10, 60),
(3, 1, 2, 10, 60),
(4, 1, 3, 10, 60),
(5, 1, 4, 10, 60),
(6, 2, 0, 10, 60),
(7, 2, 1, 10, 60),
(8, 2, 2, 10, 60),
(9, 2, 3, 10, 60),
(10, 2, 4, 10, 60);
