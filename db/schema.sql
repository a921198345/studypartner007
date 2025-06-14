-- 创建questions表
CREATE TABLE IF NOT EXISTS `questions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '题目ID',
  `subject` VARCHAR(255) NOT NULL COMMENT '学科名称，如民法、刑法等',
  `year` INT NOT NULL COMMENT '年份，如2023',
  `question_type` ENUM('single', 'multiple', 'judge') NOT NULL COMMENT '题型：单选、多选、判断',
  `question_text` TEXT NOT NULL COMMENT '题干内容',
  `options_json` JSON NOT NULL COMMENT '选项，JSON格式',
  `correct_answer` VARCHAR(255) NOT NULL COMMENT '正确答案，如A或AB',
  `explanation_text` TEXT NOT NULL COMMENT '专业解析',
  `difficulty` TINYINT DEFAULT 3 COMMENT '难度级别，1-5',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 添加索引以提高查询性能
  INDEX `idx_subject` (`subject`),
  INDEX `idx_year` (`year`),
  INDEX `idx_question_type` (`question_type`),
  INDEX `idx_subject_year` (`subject`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='法考真题库题目表';

-- 创建用户错题记录表
CREATE TABLE IF NOT EXISTS `user_wrong_answers` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `question_id` INT NOT NULL COMMENT '题目ID',
  `wrong_count` INT DEFAULT 1 COMMENT '错误次数',
  `last_wrong_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '最后一次错误时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  UNIQUE KEY `uk_user_question` (`user_id`, `question_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_question_id` (`question_id`),
  
  CONSTRAINT `fk_wrong_answers_question` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户错题记录表';

-- 创建用户收藏题目表
CREATE TABLE IF NOT EXISTS `user_favorites` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `question_id` INT NOT NULL COMMENT '题目ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  UNIQUE KEY `uk_user_question_fav` (`user_id`, `question_id`),
  INDEX `idx_user_id_fav` (`user_id`),
  
  CONSTRAINT `fk_favorites_question` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户收藏题目表';

-- 创建用户答题记录表
CREATE TABLE IF NOT EXISTS `user_answers` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `question_id` INT NOT NULL COMMENT '题目ID',
  `submitted_answer` VARCHAR(255) NOT NULL COMMENT '用户提交的答案',
  `is_correct` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否正确，0-错误，1-正确',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '答题时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 添加索引以提高查询性能
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_question_id` (`question_id`),
  INDEX `idx_user_question` (`user_id`, `question_id`),
  INDEX `idx_created_at` (`created_at`),
  
  -- 外键约束
  CONSTRAINT `fk_user_answers_question` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户答题记录表'; 