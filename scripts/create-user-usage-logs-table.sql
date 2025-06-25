-- 创建用户使用日志表
CREATE TABLE IF NOT EXISTS user_usage_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  feature_type VARCHAR(50) NOT NULL COMMENT '功能类型：ai_chat, mindmap, question_bank, notes',
  action VARCHAR(50) NOT NULL COMMENT '操作类型：view, create, update, delete',
  resource_id VARCHAR(100) DEFAULT NULL COMMENT '资源ID（可选）',
  usage_date DATE NOT NULL COMMENT '使用日期',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_date (user_id, usage_date),
  INDEX idx_feature_type (feature_type),
  INDEX idx_usage_date (usage_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户功能使用日志表'; 