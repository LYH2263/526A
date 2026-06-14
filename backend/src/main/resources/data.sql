INSERT INTO book (title, author, price, publish_date, description, total_stock, available_stock, warn_threshold) VALUES 
('三体', '刘慈欣', 39.00, '2008-01-01', '中国科幻基石', 5, 5, 2),
('活着', '余华', 25.00, '1998-05-01', '讲述了人如何去承受巨大的苦难', 3, 3, 1),
('百年孤独', '加西亚·马尔克斯', 45.00, '2011-06-01', '拉丁美洲魔幻现实主义文学的代表作', 2, 2, 1);

INSERT INTO tag (name, color) VALUES
('科幻', '#8B5CF6'),
('经典', '#EF4444'),
('获奖', '#F59E0B'),
('必读', '#10B981'),
('绝版', '#6366F1');

INSERT INTO book_tag (book_id, tag_id) VALUES
(1, 1),
(1, 3),
(2, 2),
(2, 4),
(3, 2),
(3, 5);

INSERT INTO users (username, password) VALUES 
('admin', '123456'),
('test1', '123456'),
('test2', '123456');
