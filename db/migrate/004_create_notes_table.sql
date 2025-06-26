-- 学习笔记表创建脚本
-- 执行方式：登录MySQL后使用 SOURCE /path/to/this/file.sql

USE law_exam_assistant;

-- 创建学习笔记表
CREATE TABLE IF NOT EXISTS `user_notes` (
  `note_id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '笔记ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `title` VARCHAR(80) NULL COMMENT '笔记标题',
  `content` LONGTEXT NOT NULL COMMENT '笔记内容，支持富文本HTML格式',
  `category` VARCHAR(30) DEFAULT '未分类' COMMENT '笔记分类/学科',
  `is_pinned` TINYINT(1) DEFAULT 0 COMMENT '是否置顶',
  `is_deleted` TINYINT(1) DEFAULT 0 COMMENT '是否删除（软删除）',
  `deleted_at` DATETIME DEFAULT NULL COMMENT '删除时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  PRIMARY KEY (`note_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_category` (`category`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_is_deleted` (`is_deleted`),
  
  CONSTRAINT `fk_notes_user` 
  FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学习笔记表';

-- 创建笔记关联表（用于关联知识点、题目等）
CREATE TABLE IF NOT EXISTS `note_relations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '关联ID',
  `note_id` INT UNSIGNED NOT NULL COMMENT '笔记ID',
  `relation_type` ENUM('question', 'knowledge_point', 'ai_chat') NOT NULL COMMENT '关联类型',
  `relation_id` VARCHAR(50) NOT NULL COMMENT '关联对象ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_note_relation` (`note_id`, `relation_type`, `relation_id`),
  INDEX `idx_note_id` (`note_id`),
  INDEX `idx_relation` (`relation_type`, `relation_id`),
  
  CONSTRAINT `fk_note_relations_note` 
  FOREIGN KEY (`note_id`) REFERENCES `user_notes` (`note_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='笔记关联表';

-- 创建笔记图片表
CREATE TABLE IF NOT EXISTS `note_images` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '图片ID',
  `note_id` INT UNSIGNED NOT NULL COMMENT '笔记ID',
  `image_url` VARCHAR(255) NOT NULL COMMENT '图片URL',
  `image_size` INT UNSIGNED DEFAULT 0 COMMENT '图片大小（字节）',
  `upload_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
  
  PRIMARY KEY (`id`),
  INDEX `idx_note_id` (`note_id`),
  
  CONSTRAINT `fk_note_images_note` 
  FOREIGN KEY (`note_id`) REFERENCES `user_notes` (`note_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='笔记图片表';