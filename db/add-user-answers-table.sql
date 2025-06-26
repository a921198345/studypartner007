-- 添加用户答题记录表
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