-- 学习计划功能数据库优化脚本
-- 优化查询性能，添加必要索引，优化表结构

-- ================================
-- 1. 添加缺失的索引
-- ================================

-- 为study_plans表添加性能索引
CREATE INDEX IF NOT EXISTS idx_study_plans_user_status 
ON study_plans (user_id, status);

CREATE INDEX IF NOT EXISTS idx_study_plans_created_at 
ON study_plans (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_study_plans_plan_type 
ON study_plans (plan_type);

-- 为user_preferences表添加索引
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
ON user_preferences (user_id);

CREATE INDEX IF NOT EXISTS idx_user_preferences_updated_at 
ON user_preferences (updated_at DESC);

-- 为plan_history表添加索引（如果存在）
CREATE INDEX IF NOT EXISTS idx_plan_history_user_id 
ON plan_history (user_id);

CREATE INDEX IF NOT EXISTS idx_plan_history_created_at 
ON plan_history (created_at DESC);

-- 为questions表优化搜索索引
CREATE INDEX IF NOT EXISTS idx_questions_subject_year 
ON questions (subject, year);

CREATE INDEX IF NOT EXISTS idx_questions_question_type 
ON questions (question_type);

-- 为notes表添加用户和时间索引
CREATE INDEX IF NOT EXISTS idx_notes_user_created 
ON notes (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notes_category 
ON notes (category);

-- 为user_answers表添加复合索引
CREATE INDEX IF NOT EXISTS idx_user_answers_user_question 
ON user_answers (user_id, question_id);

CREATE INDEX IF NOT EXISTS idx_user_answers_session 
ON user_answers (session_id);

CREATE INDEX IF NOT EXISTS idx_user_answers_answered_at 
ON user_answers (answered_at DESC);

-- ================================
-- 2. 优化现有查询
-- ================================

-- 创建视图以简化常用查询
CREATE OR REPLACE VIEW v_active_study_plans AS
SELECT 
    sp.*,
    up.daily_hours,
    up.weekly_days,
    up.order_method,
    up.learning_style
FROM study_plans sp
LEFT JOIN user_preferences up ON sp.user_id = up.user_id
WHERE sp.status = 'active';

-- 创建用户学习统计视图
CREATE OR REPLACE VIEW v_user_study_stats AS
SELECT 
    u.id as user_id,
    u.phone_number,
    COUNT(DISTINCT ua.question_id) as questions_answered,
    COUNT(DISTINCT CASE WHEN ua.is_correct = 1 THEN ua.question_id END) as correct_answers,
    COUNT(DISTINCT n.id) as notes_count,
    COUNT(DISTINCT sp.id) as plans_count,
    MAX(ua.answered_at) as last_practice_time,
    MAX(sp.updated_at) as last_plan_update
FROM users u
LEFT JOIN user_answers ua ON u.id = ua.user_id
LEFT JOIN notes n ON u.id = n.user_id  
LEFT JOIN study_plans sp ON u.id = sp.user_id
GROUP BY u.id, u.phone_number;

-- 创建最近活动视图
CREATE OR REPLACE VIEW v_recent_activities AS
SELECT 
    'answer' as activity_type,
    user_id,
    question_id as resource_id,
    answered_at as activity_time,
    is_correct as metadata
FROM user_answers
WHERE answered_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
UNION ALL
SELECT 
    'note' as activity_type,
    user_id,
    id as resource_id,
    created_at as activity_time,
    category as metadata
FROM notes
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
UNION ALL
SELECT 
    'plan' as activity_type,
    user_id,
    id as resource_id,
    updated_at as activity_time,
    status as metadata
FROM study_plans
WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY activity_time DESC;

-- ================================
-- 3. 存储过程优化
-- ================================

-- 创建获取用户学习计划的优化存储过程
DELIMITER //
CREATE PROCEDURE GetUserStudyPlan(IN user_id_param VARCHAR(255))
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    -- 获取活跃的学习计划及相关信息
    SELECT 
        sp.*,
        up.daily_hours,
        up.weekly_days,
        up.order_method,
        up.learning_style,
        up.difficulty_preference,
        up.review_frequency
    FROM study_plans sp
    LEFT JOIN user_preferences up ON sp.user_id = up.user_id
    WHERE sp.user_id = user_id_param 
    AND sp.status = 'active'
    ORDER BY sp.updated_at DESC
    LIMIT 1;
    
    -- 获取今日学习进度
    SELECT 
        COUNT(DISTINCT ua.question_id) as questions_today,
        COUNT(DISTINCT CASE WHEN ua.is_correct = 1 THEN ua.question_id END) as correct_today,
        COUNT(DISTINCT n.id) as notes_today
    FROM user_answers ua
    LEFT JOIN notes n ON ua.user_id = n.user_id AND DATE(n.created_at) = CURDATE()
    WHERE ua.user_id = user_id_param 
    AND DATE(ua.answered_at) = CURDATE();
    
END //
DELIMITER ;

-- 创建更新学习进度的优化存储过程
DELIMITER //
CREATE PROCEDURE UpdateStudyProgress(
    IN user_id_param VARCHAR(255),
    IN plan_id_param INT,
    IN questions_practiced INT,
    IN subjects_studied JSON,
    IN notes_created INT,
    IN actual_hours DECIMAL(3,1)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- 更新或插入今日进度记录
    INSERT INTO daily_progress (
        user_id, 
        plan_id, 
        study_date, 
        questions_practiced, 
        subjects_studied, 
        notes_created, 
        actual_hours,
        updated_at
    ) VALUES (
        user_id_param,
        plan_id_param,
        CURDATE(),
        questions_practiced,
        subjects_studied,
        notes_created,
        actual_hours,
        NOW()
    ) ON DUPLICATE KEY UPDATE
        questions_practiced = questions_practiced + VALUES(questions_practiced),
        subjects_studied = JSON_MERGE_PATCH(subjects_studied, VALUES(subjects_studied)),
        notes_created = notes_created + VALUES(notes_created),
        actual_hours = actual_hours + VALUES(actual_hours),
        updated_at = NOW();
    
    -- 更新学习计划的最后更新时间
    UPDATE study_plans 
    SET updated_at = NOW() 
    WHERE id = plan_id_param AND user_id = user_id_param;
    
    COMMIT;
END //
DELIMITER ;

-- ================================
-- 4. 创建必要的表（如果不存在）
-- ================================

-- 每日进度表
CREATE TABLE IF NOT EXISTS daily_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(255) NOT NULL,
    plan_id INT NOT NULL,
    study_date DATE NOT NULL,
    questions_practiced INT DEFAULT 0,
    subjects_studied JSON,
    notes_created INT DEFAULT 0,
    actual_hours DECIMAL(3,1) DEFAULT 0,
    completion_rate DECIMAL(3,1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_date (user_id, study_date),
    INDEX idx_daily_progress_user_date (user_id, study_date),
    INDEX idx_daily_progress_plan (plan_id)
);

-- 学习会话表
CREATE TABLE IF NOT EXISTS study_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(255) NOT NULL,
    plan_id INT,
    subject VARCHAR(50),
    activity_type VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NULL,
    duration_minutes INT,
    questions_count INT DEFAULT 0,
    notes_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_study_sessions_user (user_id),
    INDEX idx_study_sessions_date (start_time),
    INDEX idx_study_sessions_subject (subject)
);

-- ================================
-- 5. 查询优化配置
-- ================================

-- 优化MySQL配置参数（仅供参考，需要管理员权限）
-- SET GLOBAL query_cache_size = 268435456; -- 256MB
-- SET GLOBAL query_cache_type = ON;
-- SET GLOBAL key_buffer_size = 134217728; -- 128MB
-- SET GLOBAL innodb_buffer_pool_size = 536870912; -- 512MB

-- ================================
-- 6. 数据清理和维护
-- ================================

-- 创建清理旧数据的存储过程
DELIMITER //
CREATE PROCEDURE CleanupOldData()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- 清理30天前的每日进度记录
    DELETE FROM daily_progress 
    WHERE study_date < DATE_SUB(CURDATE(), INTERVAL 30 DAY);
    
    -- 清理90天前的学习会话记录  
    DELETE FROM study_sessions 
    WHERE start_time < DATE_SUB(NOW(), INTERVAL 90 DAY);
    
    -- 清理180天前的已归档学习计划
    DELETE FROM study_plans 
    WHERE status = 'archived' 
    AND updated_at < DATE_SUB(NOW(), INTERVAL 180 DAY);
    
    COMMIT;
    
    -- 输出清理统计
    SELECT 
        'Data cleanup completed' as message,
        NOW() as cleanup_time;
        
END //
DELIMITER ;

-- ================================
-- 7. 性能监控查询
-- ================================

-- 检查索引使用情况
CREATE OR REPLACE VIEW v_index_usage AS
SELECT 
    table_schema,
    table_name,
    index_name,
    seq_in_index,
    column_name,
    cardinality
FROM information_schema.statistics
WHERE table_schema = DATABASE()
AND table_name IN ('study_plans', 'user_preferences', 'questions', 'user_answers', 'notes')
ORDER BY table_name, index_name, seq_in_index;

-- 检查表大小
CREATE OR REPLACE VIEW v_table_sizes AS
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS table_size_mb,
    ROUND((data_length / 1024 / 1024), 2) AS data_size_mb,
    ROUND((index_length / 1024 / 1024), 2) AS index_size_mb,
    table_rows
FROM information_schema.tables
WHERE table_schema = DATABASE()
AND table_name IN ('study_plans', 'user_preferences', 'questions', 'user_answers', 'notes', 'daily_progress', 'study_sessions')
ORDER BY (data_length + index_length) DESC;

-- ================================
-- 8. 执行优化检查
-- ================================

-- 分析表以更新统计信息
ANALYZE TABLE study_plans;
ANALYZE TABLE user_preferences; 
ANALYZE TABLE questions;
ANALYZE TABLE user_answers;
ANALYZE TABLE notes;

-- 优化表碎片
OPTIMIZE TABLE study_plans;
OPTIMIZE TABLE user_preferences;
OPTIMIZE TABLE questions;
OPTIMIZE TABLE user_answers;
OPTIMIZE TABLE notes;

-- 显示优化结果
SELECT 'Database optimization completed' as status, NOW() as completion_time;

-- 显示索引建议
SELECT 
    'Index optimization suggestions:' as message,
    '1. Monitor slow query log for additional optimization opportunities' as suggestion_1,
    '2. Consider partitioning large tables by date if they grow significantly' as suggestion_2,
    '3. Review and update table statistics regularly using ANALYZE TABLE' as suggestion_3,
    '4. Monitor index usage and remove unused indexes' as suggestion_4;