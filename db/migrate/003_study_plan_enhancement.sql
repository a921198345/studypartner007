-- 学习计划功能数据库增强脚本
-- 修复现有表结构并添加新功能表
-- 执行方式：登录MySQL后使用 SOURCE /path/to/this/file.sql

USE law_exam_assistant;

-- =============================================================================
-- 1. 修复 study_plans 表的 user_id 类型不一致问题
-- =============================================================================

-- 备份现有数据（如果有的话）
CREATE TABLE IF NOT EXISTS `study_plans_backup` AS SELECT * FROM `study_plans`;

-- 删除现有的 study_plans 表
DROP TABLE IF EXISTS `study_plans`;

-- 重新创建 study_plans 表，修正 user_id 类型
CREATE TABLE `study_plans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '学习计划ID',
  `user_id` INT NOT NULL COMMENT '用户ID，关联users表',
  `plan_name` VARCHAR(100) NOT NULL DEFAULT '我的学习计划' COMMENT '计划名称',
  `plan_status` ENUM('active', 'completed', 'paused', 'archived') DEFAULT 'active' COMMENT '计划状态',
  
  -- 三级计划结构数据
  `overall_strategy` JSON COMMENT '总体规划思路',
  `daily_plan` JSON COMMENT '日计划数据',
  `weekly_plan` JSON COMMENT '周计划数据',
  
  -- 计划配置信息
  `subject_progress` JSON COMMENT '科目进度配置',
  `subject_order` JSON COMMENT '科目学习顺序',
  `study_schedule` JSON COMMENT '学习时间安排',
  `custom_notes` TEXT COMMENT '用户自定义说明',
  
  -- 计划执行情况
  `completion_rate` DECIMAL(5,2) DEFAULT 0.00 COMMENT '完成率百分比',
  `last_study_date` DATE COMMENT '最后学习日期',
  `actual_study_hours` DECIMAL(8,2) DEFAULT 0.00 COMMENT '实际学习时长',
  
  -- 时间戳
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `started_at` TIMESTAMP NULL COMMENT '开始执行时间',
  `completed_at` TIMESTAMP NULL COMMENT '完成时间',
  
  -- 外键约束
  CONSTRAINT `fk_study_plans_user` 
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) 
    ON DELETE CASCADE ON UPDATE CASCADE,
    
  -- 索引
  INDEX `idx_user_status` (`user_id`, `plan_status`),
  INDEX `idx_completion_rate` (`completion_rate`),
  INDEX `idx_last_study` (`last_study_date`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学习计划主表';

-- =============================================================================
-- 2. 创建用户偏好设置表
-- =============================================================================

CREATE TABLE `user_preferences` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '偏好设置ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  
  -- 学习时间偏好
  `daily_hours` INT DEFAULT 3 COMMENT '每日学习时长（小时）',
  `weekly_days` INT DEFAULT 5 COMMENT '每周学习天数',
  `preferred_study_times` JSON COMMENT '偏好学习时间段',
  
  -- 学习方式偏好
  `order_method` ENUM('ai', 'manual') DEFAULT 'ai' COMMENT '科目排序方式',
  `learning_style` VARCHAR(50) DEFAULT 'video_text' COMMENT '学习方式偏好',
  `difficulty_preference` VARCHAR(50) DEFAULT 'gradual' COMMENT '难度递进偏好',
  `review_frequency` VARCHAR(50) DEFAULT 'weekly' COMMENT '复习频率偏好',
  
  -- 科目偏好
  `subject_priorities` JSON COMMENT '科目优先级设置',
  `weak_subjects` JSON COMMENT '薄弱科目列表',
  `mastered_subjects` JSON COMMENT '已掌握科目列表',
  
  -- 功能使用偏好
  `use_knowledge_map` BOOLEAN DEFAULT TRUE COMMENT '是否使用知识导图',
  `use_ai_assistant` BOOLEAN DEFAULT TRUE COMMENT '是否使用AI助手',
  `auto_save_notes` BOOLEAN DEFAULT TRUE COMMENT '是否自动保存笔记',
  
  -- 提醒设置
  `daily_reminder` BOOLEAN DEFAULT TRUE COMMENT '每日学习提醒',
  `weekly_summary` BOOLEAN DEFAULT TRUE COMMENT '周总结提醒',
  `break_reminder` BOOLEAN DEFAULT TRUE COMMENT '休息提醒',
  
  -- 时间戳
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 约束和索引
  CONSTRAINT `fk_user_preferences_user` 
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) 
    ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uk_user_preferences` (`user_id`),
  INDEX `idx_daily_hours` (`daily_hours`),
  INDEX `idx_order_method` (`order_method`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户学习偏好设置表';

-- =============================================================================
-- 3. 创建学习计划历史记录表
-- =============================================================================

CREATE TABLE `plan_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '历史记录ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `plan_id` INT COMMENT '关联的学习计划ID',
  
  -- 历史版本信息
  `version_number` INT DEFAULT 1 COMMENT '版本号',
  `action_type` ENUM('created', 'modified', 'completed', 'paused', 'resumed', 'archived') 
    NOT NULL COMMENT '操作类型',
  `action_description` TEXT COMMENT '操作描述',
  
  -- 计划数据快照
  `plan_snapshot` JSON COMMENT '计划数据快照',
  `changes_made` JSON COMMENT '具体变更内容',
  
  -- 用户反馈
  `user_feedback` TEXT COMMENT '用户反馈内容',
  `satisfaction_rating` TINYINT COMMENT '满意度评分(1-5)',
  
  -- 执行情况统计
  `daily_completion_rate` DECIMAL(5,2) COMMENT '当日完成率',
  `weekly_completion_rate` DECIMAL(5,2) COMMENT '当周完成率',
  `study_duration` DECIMAL(8,2) COMMENT '学习时长（小时）',
  
  -- 时间戳
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '记录时间',
  
  -- 约束和索引
  CONSTRAINT `fk_plan_history_user` 
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) 
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_plan_history_plan` 
    FOREIGN KEY (`plan_id`) REFERENCES `study_plans`(`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE,
    
  INDEX `idx_user_action` (`user_id`, `action_type`),
  INDEX `idx_plan_version` (`plan_id`, `version_number`),
  INDEX `idx_satisfaction` (`satisfaction_rating`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学习计划历史记录表';

-- =============================================================================
-- 4. 创建学习进度跟踪表
-- =============================================================================

CREATE TABLE `learning_progress` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '进度记录ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `plan_id` INT COMMENT '关联学习计划ID',
  
  -- 科目和章节信息
  `subject_name` VARCHAR(50) NOT NULL COMMENT '科目名称',
  `chapter_name` VARCHAR(100) COMMENT '章节名称',
  `section_name` VARCHAR(100) COMMENT '小节名称',
  
  -- 进度信息
  `progress_percentage` DECIMAL(5,2) DEFAULT 0.00 COMMENT '进度百分比',
  `study_status` ENUM('not_started', 'in_progress', 'completed', 'review') 
    DEFAULT 'not_started' COMMENT '学习状态',
  
  -- 学习统计
  `study_time_minutes` INT DEFAULT 0 COMMENT '学习时长（分钟）',
  `practice_count` INT DEFAULT 0 COMMENT '练习题数量',
  `correct_rate` DECIMAL(5,2) COMMENT '正确率',
  `last_review_date` DATE COMMENT '最后复习日期',
  
  -- 难度和掌握度
  `difficulty_level` TINYINT DEFAULT 3 COMMENT '难度等级(1-5)',
  `mastery_level` TINYINT DEFAULT 1 COMMENT '掌握程度(1-5)',
  `confidence_score` TINYINT COMMENT '自信度评分(1-5)',
  
  -- 时间戳
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 约束和索引
  CONSTRAINT `fk_learning_progress_user` 
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) 
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_learning_progress_plan` 
    FOREIGN KEY (`plan_id`) REFERENCES `study_plans`(`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE,
    
  UNIQUE KEY `uk_user_subject_chapter` (`user_id`, `subject_name`, `chapter_name`),
  INDEX `idx_progress` (`progress_percentage`),
  INDEX `idx_study_status` (`study_status`),
  INDEX `idx_mastery_level` (`mastery_level`),
  INDEX `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学习进度跟踪表';

-- =============================================================================
-- 5. 扩展 users 表，添加学习统计字段
-- =============================================================================

ALTER TABLE `users` 
ADD COLUMN `total_study_hours` DECIMAL(8,2) DEFAULT 0.00 COMMENT '总学习时长' AFTER `membership_expires_at`,
ADD COLUMN `total_plans_created` INT DEFAULT 0 COMMENT '创建计划总数' AFTER `total_study_hours`,
ADD COLUMN `completed_plans` INT DEFAULT 0 COMMENT '完成计划数量' AFTER `total_plans_created`,
ADD COLUMN `current_streak` INT DEFAULT 0 COMMENT '当前连续学习天数' AFTER `completed_plans`,
ADD COLUMN `longest_streak` INT DEFAULT 0 COMMENT '最长连续学习天数' AFTER `current_streak`,
ADD COLUMN `preferred_subjects` JSON COMMENT '偏好科目设置' AFTER `longest_streak`,
ADD COLUMN `last_active_date` DATE COMMENT '最后活跃日期' AFTER `preferred_subjects`;

-- 添加学习统计相关索引
ALTER TABLE `users` 
ADD INDEX `idx_study_hours` (`total_study_hours`),
ADD INDEX `idx_streak` (`current_streak`),
ADD INDEX `idx_last_active` (`last_active_date`);

-- =============================================================================
-- 6. 创建系统配置表（学习计划相关配置）
-- =============================================================================

CREATE TABLE `study_plan_config` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '配置ID',
  `config_key` VARCHAR(100) NOT NULL COMMENT '配置键名',
  `config_value` JSON COMMENT '配置值',
  `config_type` ENUM('system', 'feature', 'limit', 'template') DEFAULT 'system' COMMENT '配置类型',
  `description` TEXT COMMENT '配置描述',
  `is_active` BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  UNIQUE KEY `uk_config_key` (`config_key`),
  INDEX `idx_config_type` (`config_type`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学习计划系统配置表';

-- 插入默认配置
INSERT INTO `study_plan_config` (`config_key`, `config_value`, `config_type`, `description`) VALUES
('subjects_list', '["民法", "刑法", "行政法", "刑事诉讼法", "民事诉讼法", "商经法", "理论法", "三国法"]', 'system', '法考科目列表'),
('default_study_hours', '{"min": 1, "max": 8, "default": 3}', 'system', '默认学习时长范围'),
('default_study_days', '{"min": 3, "max": 7, "default": 5}', 'system', '默认学习天数范围'),
('subject_weights', '{"民法": 0.25, "刑法": 0.25, "行政法": 0.15, "刑事诉讼法": 0.1, "民事诉讼法": 0.1, "商经法": 0.05, "理论法": 0.05, "三国法": 0.05}', 'system', '科目重要程度权重'),
('plan_generation_limits', '{"free": 3, "premium": 10, "vip": -1}', 'limit', '计划生成次数限制'),
('ai_prompt_templates', '{"strategy": "基于用户数据生成总体学习策略", "daily": "生成具体的日学习计划", "weekly": "生成周学习安排"}', 'template', 'AI生成提示模板');

-- =============================================================================
-- 7. 优化性能：添加必要索引
-- =============================================================================

-- 为JSON字段创建虚拟列和索引（如果MySQL版本支持）
-- ALTER TABLE `study_plans` ADD COLUMN `plan_status_virtual` VARCHAR(20) 
-- GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(`overall_strategy`, '$.status'))) VIRTUAL;

-- 创建复合索引优化常用查询
CREATE INDEX `idx_user_plan_status_date` ON `study_plans` (`user_id`, `plan_status`, `created_at`);
CREATE INDEX `idx_completion_study_date` ON `study_plans` (`completion_rate`, `last_study_date`);

-- =============================================================================
-- 完成提示
-- =============================================================================

SELECT '✅ 学习计划数据库结构增强完成！' as message;
SELECT CONCAT('📊 已创建表数量: ', COUNT(*)) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'law_exam_assistant' 
AND table_name IN ('study_plans', 'user_preferences', 'plan_history', 'learning_progress', 'study_plan_config');