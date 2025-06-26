-- 初始数据库表结构脚本
-- 执行方式：登录MySQL后使用 SOURCE /path/to/this/file.sql

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS law_exam_assistant CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE law_exam_assistant;

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

-- 创建mindmaps表（知识导图表）
-- 之前找到的表名不一致的问题（mind_maps vs mindmaps）
-- 我们创建两个表，并添加数据同步触发器
CREATE TABLE IF NOT EXISTS `mindmaps` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `subject` varchar(255) NOT NULL,
  `content` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `subject` (`subject`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='法考知识导图数据';

-- 导入民法知识导图示例数据
INSERT INTO `mindmaps` (`subject`, `content`) VALUES 
('民法', '{
  "name": "民法",
  "children": [
    {
      "name": "民法总则",
      "children": [
        { "name": "基本规定" },
        { "name": "自然人" },
        { "name": "法人" },
        { "name": "民事法律行为" },
        { "name": "代理" },
        { "name": "民事权利" },
        { "name": "民事责任" },
        { "name": "诉讼时效" }
      ]
    },
    {
      "name": "物权法",
      "children": [
        { "name": "通则" },
        { "name": "所有权" },
        { "name": "用益物权" },
        { "name": "担保物权" },
        { "name": "占有" }
      ]
    },
    {
      "name": "合同法",
      "children": [
        { "name": "通则" },
        { "name": "合同的订立" },
        { "name": "合同的效力" },
        { "name": "合同的履行" },
        { "name": "合同的变更和转让" },
        { "name": "合同的权利义务终止" },
        { "name": "违约责任" }
      ]
    }
  ]
}')
ON DUPLICATE KEY UPDATE `content` = VALUES(`content`), `updated_at` = CURRENT_TIMESTAMP; 