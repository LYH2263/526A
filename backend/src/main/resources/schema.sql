CREATE TABLE IF NOT EXISTS category (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '分类名称',
    parent_id BIGINT DEFAULT NULL COMMENT '父分类ID，顶级分类为NULL',
    sort_order INT DEFAULT 0 COMMENT '排序序号',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_parent_id (parent_id),
    FOREIGN KEY (parent_id) REFERENCES category(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS book (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL COMMENT '书名',
    author VARCHAR(255) NOT NULL COMMENT '作者',
    price DECIMAL(10, 2) NOT NULL COMMENT '价格',
    publish_date DATE COMMENT '出版日期',
    description TEXT COMMENT '描述',
    category_id BIGINT DEFAULT NULL COMMENT '分类ID',
    total_stock INT NOT NULL DEFAULT 0 COMMENT '总库存',
    available_stock INT NOT NULL DEFAULT 0 COMMENT '可借库存',
    warn_threshold INT NOT NULL DEFAULT 0 COMMENT '库存预警阈值',
    version INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    avg_rating DECIMAL(3, 2) DEFAULT 0.00 COMMENT '平均评分',
    review_count INT NOT NULL DEFAULT 0 COMMENT '评论数量',
    INDEX idx_category_id (category_id),
    FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS book_review (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    book_id BIGINT NOT NULL COMMENT '图书ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    username VARCHAR(50) NOT NULL COMMENT '用户名（冗余）',
    rating TINYINT NOT NULL COMMENT '评分：1-5星',
    content TEXT COMMENT '评论文本',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_book_user (book_id, user_id),
    INDEX idx_book_id (book_id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (book_id) REFERENCES book(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS borrow_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    book_id BIGINT NOT NULL COMMENT '图书ID',
    book_title VARCHAR(255) NOT NULL COMMENT '图书名称（冗余）',
    borrower VARCHAR(50) NOT NULL COMMENT '借阅人',
    borrow_time DATETIME NOT NULL COMMENT '借出时间',
    due_time DATETIME NOT NULL COMMENT '应还时间',
    return_time DATETIME DEFAULT NULL COMMENT '实际归还时间',
    status VARCHAR(20) NOT NULL DEFAULT 'BORROWED' COMMENT '状态：BORROWED-在借，RETURNED-已还',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_book_id (book_id),
    INDEX idx_borrower (borrower),
    INDEX idx_status (status),
    FOREIGN KEY (book_id) REFERENCES book(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tag (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE COMMENT '标签名称(归一化)',
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6' COMMENT '标签颜色(HEX)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS book_tag (
    book_id BIGINT NOT NULL COMMENT '图书ID',
    tag_id BIGINT NOT NULL COMMENT '标签ID',
    PRIMARY KEY (book_id, tag_id),
    INDEX idx_tag_id (tag_id),
    FOREIGN KEY (book_id) REFERENCES book(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password VARCHAR(100) NOT NULL COMMENT '密码'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS favorite (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    book_id BIGINT NOT NULL COMMENT '图书ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
    UNIQUE KEY uk_user_book (user_id, book_id),
    INDEX idx_user_id (user_id),
    INDEX idx_book_id (book_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES book(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL COMMENT '通知类型：LOW_STOCK-低库存预警',
    title VARCHAR(255) NOT NULL COMMENT '通知标题',
    content TEXT COMMENT '通知内容',
    book_id BIGINT DEFAULT NULL COMMENT '关联图书ID',
    book_title VARCHAR(255) DEFAULT NULL COMMENT '图书名称（冗余）',
    stock_snapshot INT DEFAULT NULL COMMENT '库存快照（触发预警时的库存）',
    is_read TINYINT NOT NULL DEFAULT 0 COMMENT '是否已读：0-未读，1-已读',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at),
    INDEX idx_book_id (book_id),
    INDEX idx_book_type (book_id, type),
    FOREIGN KEY (book_id) REFERENCES book(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bookshelf (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '书架名称',
    position_x INT NOT NULL DEFAULT 0 COMMENT '书架在画布上的X坐标',
    position_y INT NOT NULL DEFAULT 0 COMMENT '书架在画布上的Y坐标',
    width INT NOT NULL DEFAULT 400 COMMENT '书架宽度',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序序号',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shelf_layer (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bookshelf_id BIGINT NOT NULL COMMENT '所属书架ID',
    layer_index INT NOT NULL COMMENT '第几层（从0开始）',
    capacity INT NOT NULL DEFAULT 10 COMMENT '该格层容量上限',
    height INT NOT NULL DEFAULT 60 COMMENT '格层高度',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_bookshelf_id (bookshelf_id),
    FOREIGN KEY (bookshelf_id) REFERENCES bookshelf(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS book_placement (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    book_id BIGINT NOT NULL COMMENT '图书ID',
    bookshelf_id BIGINT NOT NULL COMMENT '书架ID',
    layer_id BIGINT NOT NULL COMMENT '格层ID',
    position_index INT NOT NULL COMMENT '在格层中的位置序号',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_book (book_id),
    INDEX idx_layer (layer_id),
    INDEX idx_bookshelf (bookshelf_id),
    FOREIGN KEY (book_id) REFERENCES book(id) ON DELETE CASCADE,
    FOREIGN KEY (bookshelf_id) REFERENCES bookshelf(id) ON DELETE CASCADE,
    FOREIGN KEY (layer_id) REFERENCES shelf_layer(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shelf_layout_version (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    version INT NOT NULL DEFAULT 1 COMMENT '布局版本号',
    snapshot JSON COMMENT '布局快照（用于冲突检测和回滚）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
