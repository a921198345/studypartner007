-- 创建向量存储表
CREATE TABLE IF NOT EXISTS vector_chunks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doc_id VARCHAR(100) NOT NULL,
    chunk_index INT NOT NULL,
    original_text TEXT NOT NULL,
    vector_embedding LONGBLOB NOT NULL COMMENT '向量嵌入二进制数据',
    source_document_name VARCHAR(255) NOT NULL COMMENT '源文档名称',
    chunk_id_in_document VARCHAR(100) NOT NULL COMMENT '分段在文档中的唯一标识',
    law_name VARCHAR(255) COMMENT '法律名称',
    book VARCHAR(100) COMMENT '编',
    chapter VARCHAR(100) COMMENT '章',
    section VARCHAR(100) COMMENT '节',
    article VARCHAR(100) COMMENT '条',
    token_count INT COMMENT '分段的token数量',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_doc_chunk (doc_id, chunk_index),
    INDEX idx_source (source_document_name),
    INDEX idx_law (law_name),
    INDEX idx_article (article)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建文档记录表（如果不存在）
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doc_id VARCHAR(100) UNIQUE NOT NULL COMMENT '文档唯一标识',
    doc_name VARCHAR(255) NOT NULL COMMENT '文档名称',
    file_path VARCHAR(500) NOT NULL COMMENT '文件路径',
    doc_type VARCHAR(50) DEFAULT 'legal' COMMENT '文档类型: legal, exam, note等',
    subject_area VARCHAR(100) COMMENT '学科/法典分类',
    file_size INT COMMENT '文件大小(字节)',
    page_count INT COMMENT '页数',
    word_count INT COMMENT '字数',
    processed BOOLEAN DEFAULT FALSE COMMENT '是否已处理',
    vectorized BOOLEAN DEFAULT FALSE COMMENT '是否已向量化',
    is_active TINYINT(1) DEFAULT 1 COMMENT '是否活跃',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_doc_id (doc_id),
    INDEX idx_doc_type (doc_type),
    INDEX idx_subject (subject_area)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建用户搜索历史表
CREATE TABLE IF NOT EXISTS search_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL COMMENT '用户ID',
    query_text TEXT NOT NULL COMMENT '搜索文本',
    filters JSON COMMENT '过滤条件',
    result_count INT COMMENT '结果数量',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建向量检索缓存表（可选，用于缓存热门查询的结果）
CREATE TABLE IF NOT EXISTS vector_search_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    query_hash VARCHAR(64) NOT NULL COMMENT '查询的哈希值',
    query_text TEXT NOT NULL COMMENT '原始查询文本',
    filters JSON COMMENT '过滤条件',
    results JSON NOT NULL COMMENT '搜索结果',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 1 DAY) COMMENT '过期时间',
    
    UNIQUE KEY uk_query_hash (query_hash),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 