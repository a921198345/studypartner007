-- 创建用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `phone` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(100),
  `email` VARCHAR(255),
  `membership_status` ENUM('free_user', 'paid_user') DEFAULT 'free_user',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 创建验证码表
CREATE TABLE IF NOT EXISTS `verification_codes` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `phone_number` VARCHAR(20) NOT NULL,
  `code` VARCHAR(10) NOT NULL,
  `used` TINYINT(1) DEFAULT 0,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_phone_code` (`phone_number`, `code`),
  INDEX `idx_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;