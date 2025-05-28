-- 用户表和短信验证码表创建脚本
-- 执行方式：登录MySQL后使用 SOURCE /path/to/this/file.sql

USE law_exam_assistant;

-- 创建users表
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
  `phone_number` VARCHAR(20) NOT NULL COMMENT '手机号，唯一标识',
  `nickname` VARCHAR(50) DEFAULT NULL COMMENT '用户昵称',
  `avatar_url` VARCHAR(255) DEFAULT NULL COMMENT '用户头像URL',
  `wechat_openid` VARCHAR(50) DEFAULT NULL COMMENT '微信OpenID',
  `membership_type` ENUM('free_user', 'paid_user') DEFAULT 'free_user' COMMENT '会员类型',
  `membership_expires_at` DATETIME DEFAULT NULL COMMENT '会员过期时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `last_login` TIMESTAMP NULL COMMENT '最后登录时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 添加索引以提高查询性能
  UNIQUE KEY `uk_phone_number` (`phone_number`),
  UNIQUE KEY `uk_wechat_openid` (`wechat_openid`),
  INDEX `idx_membership` (`membership_type`, `membership_expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户信息表';

-- 创建短信验证码表
CREATE TABLE IF NOT EXISTS `sms_verification` (
  `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '验证码ID',
  `phone_number` VARCHAR(20) NOT NULL COMMENT '手机号',
  `verification_code` VARCHAR(10) NOT NULL COMMENT '验证码',
  `purpose` ENUM('login', 'register', 'bind_wechat', 'other') DEFAULT 'login' COMMENT '验证码用途',
  `expire_at` TIMESTAMP NOT NULL COMMENT '过期时间',
  `is_used` BOOLEAN DEFAULT FALSE COMMENT '是否已使用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  -- 添加索引
  INDEX `idx_phone_verification` (`phone_number`, `verification_code`),
  INDEX `idx_expire_at` (`expire_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信验证码表';

-- 更新外键关联
ALTER TABLE `user_wrong_answers` 
ADD CONSTRAINT `fk_wrong_answers_user` 
FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

ALTER TABLE `user_favorites` 
ADD CONSTRAINT `fk_favorites_user` 
FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE; 