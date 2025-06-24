-- 会员功能相关数据库更新
-- 执行方式：登录MySQL后使用 SOURCE /path/to/this/file.sql

USE law_exam_assistant;

-- 1. 修改users表的membership_type枚举值
ALTER TABLE `users` 
MODIFY COLUMN `membership_type` ENUM('free_user', 'active_member') 
DEFAULT 'free_user' 
COMMENT '会员类型：free_user(非会员), active_member(活跃会员)';

-- 2. 添加AI查询相关字段
ALTER TABLE `users` 
ADD COLUMN IF NOT EXISTS `daily_ai_queries_used` INT DEFAULT 0 COMMENT '今日已使用AI查询次数',
ADD COLUMN IF NOT EXISTS `last_ai_query_date` DATE DEFAULT NULL COMMENT '最后AI查询日期';

-- 3. 添加学习笔记计数字段
ALTER TABLE `users` 
ADD COLUMN IF NOT EXISTS `notes_count` INT DEFAULT 0 COMMENT '用户笔记总数';

-- 4. 创建会员订单表
CREATE TABLE IF NOT EXISTS `membership_orders` (
  `order_id` VARCHAR(64) PRIMARY KEY COMMENT '订单ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `membership_plan` ENUM('monthly', 'quarterly', 'yearly') NOT NULL COMMENT '会员套餐',
  `price` DECIMAL(10, 2) NOT NULL COMMENT '支付金额',
  `payment_method` ENUM('alipay', 'wechat', 'test') COMMENT '支付方式',
  `payment_status` ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending' COMMENT '支付状态',
  `payment_time` TIMESTAMP NULL COMMENT '支付时间',
  `transaction_id` VARCHAR(100) COMMENT '第三方支付流水号',
  `membership_start_date` DATE COMMENT '会员开始日期',
  `membership_end_date` DATE COMMENT '会员结束日期',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 索引
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_payment_status` (`payment_status`),
  INDEX `idx_created_at` (`created_at`),
  
  -- 外键
  CONSTRAINT `fk_membership_order_user` 
  FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会员订单表';

-- 5. 创建用户使用记录表（用于跟踪各功能使用情况）
CREATE TABLE IF NOT EXISTS `user_usage_logs` (
  `log_id` BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '日志ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `feature_type` ENUM('ai_chat', 'mindmap', 'question_bank', 'notes') NOT NULL COMMENT '功能类型',
  `action` VARCHAR(50) NOT NULL COMMENT '操作类型',
  `resource_id` VARCHAR(100) COMMENT '资源ID（如题目ID、笔记ID等）',
  `usage_date` DATE NOT NULL COMMENT '使用日期',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  -- 索引
  INDEX `idx_user_feature_date` (`user_id`, `feature_type`, `usage_date`),
  INDEX `idx_created_at` (`created_at`),
  
  -- 外键
  CONSTRAINT `fk_usage_log_user` 
  FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户使用记录表';

-- 6. 更新现有用户数据，将'free'转换为'free_user'，'paid'转换为'active_member'
UPDATE `users` SET `membership_type` = 'free_user' WHERE `membership_type` = 'free' OR `membership_type` IS NULL;
UPDATE `users` SET `membership_type` = 'active_member' WHERE `membership_type` = 'paid';

-- 7. 创建存储过程：重置每日AI查询次数
DELIMITER $$
CREATE PROCEDURE IF NOT EXISTS `reset_daily_ai_queries`()
BEGIN
    UPDATE `users` 
    SET `daily_ai_queries_used` = 0 
    WHERE `last_ai_query_date` < CURDATE() OR `last_ai_query_date` IS NULL;
END$$
DELIMITER ;

-- 8. 创建事件：每日零点自动重置AI查询次数（需要开启事件调度器）
-- SET GLOBAL event_scheduler = ON;
CREATE EVENT IF NOT EXISTS `daily_reset_ai_queries`
ON SCHEDULE EVERY 1 DAY 
STARTS (CURRENT_DATE + INTERVAL 1 DAY)
DO CALL reset_daily_ai_queries();

SHOW WARNINGS;