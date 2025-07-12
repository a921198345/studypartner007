-- ========================================
-- Law-Exam-Assistant 数据库性能优化脚本
-- ========================================

USE law_exam_assistant;

-- ========================================
-- 1. 核心表索引优化
-- ========================================

-- 1.1 questions表索引优化
-- 添加复合索引支持常见查询组合
CREATE INDEX IF NOT EXISTS idx_questions_subject_year_type 
ON questions (subject, year, question_type);

CREATE INDEX IF NOT EXISTS idx_questions_year_subject 
ON questions (year, subject);

CREATE INDEX IF NOT EXISTS idx_questions_search_text 
ON questions (subject, year) 
COMMENT '支持按学科和年份筛选后的文本搜索';

-- 添加全文索引支持文本搜索（如果MySQL版本支持）
-- ALTER TABLE questions ADD FULLTEXT(question_text, explanation_text);

-- 1.2 user_answers表索引优化
-- 添加复合索引支持答题历史查询
CREATE INDEX IF NOT EXISTS idx_user_answers_user_session_time 
ON user_answers (user_id, session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_answers_question_user 
ON user_answers (question_id, user_id);

CREATE INDEX IF NOT EXISTS idx_user_answers_session_time 
ON user_answers (session_id, created_at DESC);

-- 支持答题统计查询
CREATE INDEX IF NOT EXISTS idx_user_answers_user_correct_time 
ON user_answers (user_id, is_correct, created_at DESC);

-- 1.3 user_favorites表索引优化
-- 已有基础索引，添加时间排序索引
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_time 
ON user_favorites (user_id, created_at DESC);

-- 1.4 users表索引优化
-- 添加会员状态查询索引
CREATE INDEX IF NOT EXISTS idx_users_membership_expires 
ON users (membership_type, membership_expires_at);

-- 添加活跃用户查询索引
CREATE INDEX IF NOT EXISTS idx_users_last_login 
ON users (last_login DESC);

-- ========================================
-- 2. 扩展表索引优化
-- ========================================

-- 2.1 study_plans表索引优化
CREATE INDEX IF NOT EXISTS idx_study_plans_user_status_updated 
ON study_plans (user_id, plan_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_study_plans_completion_rate 
ON study_plans (completion_rate DESC);

-- 2.2 user_notes表索引优化
CREATE INDEX IF NOT EXISTS idx_user_notes_user_category_time 
ON user_notes (user_id, category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notes_deleted_time 
ON user_notes (is_deleted, created_at DESC);

-- 2.3 learning_progress表索引优化
CREATE INDEX IF NOT EXISTS idx_learning_progress_user_subject 
ON learning_progress (user_id, subject_name, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_progress_status_mastery 
ON learning_progress (study_status, mastery_level);

-- ========================================
-- 3. 查询优化视图
-- ========================================

-- 3.1 用户答题统计视图
CREATE OR REPLACE VIEW v_user_answer_stats AS
SELECT 
    ua.user_id,
    COUNT(DISTINCT ua.question_id) as total_answered,
    COUNT(DISTINCT CASE WHEN ua.is_correct = 1 THEN ua.question_id END) as correct_answered,
    ROUND(COUNT(DISTINCT CASE WHEN ua.is_correct = 1 THEN ua.question_id END) * 100.0 / COUNT(DISTINCT ua.question_id), 2) as accuracy_rate,
    COUNT(DISTINCT q.subject) as subjects_practiced,
    MAX(ua.created_at) as last_practice_time
FROM user_answers ua
LEFT JOIN questions q ON ua.question_id = q.id
WHERE ua.user_id IS NOT NULL
GROUP BY ua.user_id;

-- 3.2 题目答题统计视图
CREATE OR REPLACE VIEW v_question_stats AS
SELECT 
    q.id,
    q.subject,
    q.year,
    q.question_type,
    COUNT(ua.id) as total_attempts,
    COUNT(CASE WHEN ua.is_correct = 1 THEN 1 END) as correct_attempts,
    ROUND(COUNT(CASE WHEN ua.is_correct = 1 THEN 1 END) * 100.0 / NULLIF(COUNT(ua.id), 0), 2) as success_rate,
    COUNT(DISTINCT ua.user_id) as unique_users
FROM questions q
LEFT JOIN user_answers ua ON q.id = ua.question_id
GROUP BY q.id, q.subject, q.year, q.question_type;

-- 3.3 用户学习进度汇总视图
CREATE OR REPLACE VIEW v_user_study_summary AS
SELECT 
    u.user_id,
    u.phone_number,
    u.membership_type,
    COALESCE(ans.total_answered, 0) as questions_answered,
    COALESCE(ans.correct_answered, 0) as correct_answers,
    COALESCE(ans.accuracy_rate, 0) as accuracy_rate,
    COALESCE(fav.favorite_count, 0) as favorites_count,
    COALESCE(notes.notes_count, 0) as notes_count,
    COALESCE(plans.active_plans, 0) as active_plans,
    ans.last_practice_time,
    u.created_at as user_created_at
FROM users u
LEFT JOIN v_user_answer_stats ans ON u.user_id = ans.user_id
LEFT JOIN (
    SELECT user_id, COUNT(*) as favorite_count 
    FROM user_favorites 
    GROUP BY user_id
) fav ON u.user_id = fav.user_id
LEFT JOIN (
    SELECT user_id, COUNT(*) as notes_count 
    FROM user_notes 
    WHERE is_deleted = 0 
    GROUP BY user_id
) notes ON u.user_id = notes.user_id
LEFT JOIN (
    SELECT user_id, COUNT(*) as active_plans 
    FROM study_plans 
    WHERE plan_status = 'active' 
    GROUP BY user_id
) plans ON u.user_id = plans.user_id;

-- ========================================
-- 4. 存储过程优化
-- ========================================

-- 4.1 获取用户答题历史的优化存储过程
DELIMITER $$
CREATE PROCEDURE GetUserAnswerHistory(
    IN p_user_id INT,
    IN p_session_id VARCHAR(255),
    IN p_subject VARCHAR(255),
    IN p_year INT,
    IN p_limit INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    -- 构建动态查询
    SET @sql = 'SELECT 
        ua.question_id,
        ua.submitted_answer,
        ua.is_correct,
        ua.created_at,
        q.question_type,
        q.correct_answer,
        q.explanation_text,
        q.subject,
        q.year
    FROM user_answers ua
    JOIN questions q ON ua.question_id = q.id
    WHERE 1=1';
    
    SET @params = '';
    
    IF p_user_id IS NOT NULL THEN
        SET @sql = CONCAT(@sql, ' AND ua.user_id = ?');
        SET @params = CONCAT(@params, p_user_id, ',');
    END IF;
    
    IF p_session_id IS NOT NULL THEN
        SET @sql = CONCAT(@sql, ' AND ua.session_id = ?');
        SET @params = CONCAT(@params, p_session_id, ',');
    END IF;
    
    IF p_subject IS NOT NULL THEN
        SET @sql = CONCAT(@sql, ' AND q.subject = ?');
        SET @params = CONCAT(@params, p_subject, ',');
    END IF;
    
    IF p_year IS NOT NULL THEN
        SET @sql = CONCAT(@sql, ' AND q.year = ?');
        SET @params = CONCAT(@params, p_year, ',');
    END IF;
    
    SET @sql = CONCAT(@sql, ' ORDER BY ua.created_at DESC');
    
    IF p_limit IS NOT NULL THEN
        SET @sql = CONCAT(@sql, ' LIMIT ?');
        SET @params = CONCAT(@params, p_limit, ',');
    END IF;
    
    -- 执行查询
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    
END$$
DELIMITER ;

-- 4.2 题目搜索优化存储过程
DELIMITER $$
CREATE PROCEDURE SearchQuestions(
    IN p_subject VARCHAR(255),
    IN p_year VARCHAR(255),
    IN p_question_type INT,
    IN p_search_text VARCHAR(255),
    IN p_is_member BOOLEAN,
    IN p_page INT,
    IN p_limit INT
)
BEGIN
    DECLARE v_offset INT DEFAULT 0;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    -- 计算偏移量
    SET v_offset = (p_page - 1) * p_limit;
    
    -- 构建WHERE条件
    SET @where_clause = ' WHERE 1=1';
    SET @params = '';
    
    IF p_subject IS NOT NULL THEN
        SET @where_clause = CONCAT(@where_clause, ' AND subject = ?');
    END IF;
    
    IF p_year IS NOT NULL THEN
        IF FIND_IN_SET(',', p_year) > 0 THEN
            SET @where_clause = CONCAT(@where_clause, ' AND year IN (', p_year, ')');
        ELSE
            SET @where_clause = CONCAT(@where_clause, ' AND year = ?');
        END IF;
    END IF;
    
    IF p_question_type IS NOT NULL THEN
        SET @where_clause = CONCAT(@where_clause, ' AND question_type = ?');
    END IF;
    
    IF p_search_text IS NOT NULL THEN
        SET @where_clause = CONCAT(@where_clause, ' AND (question_text LIKE ? OR options_json LIKE ?)');
    END IF;
    
    -- 非会员限制
    IF NOT p_is_member THEN
        SET @where_clause = CONCAT(@where_clause, ' AND year = 2022');
    END IF;
    
    -- 执行查询
    SET @sql = CONCAT('SELECT 
        id, question_code, subject, year, question_type,
        question_text, options_json, correct_answer, explanation_text
    FROM questions', @where_clause, ' ORDER BY id LIMIT ? OFFSET ?');
    
    PREPARE stmt FROM @sql;
    EXECUTE stmt USING p_limit, v_offset;
    DEALLOCATE PREPARE stmt;
    
END$$
DELIMITER ;

-- ========================================
-- 5. 性能监控和维护
-- ========================================

-- 5.1 慢查询分析视图
CREATE OR REPLACE VIEW v_slow_queries AS
SELECT 
    'questions_search' as query_type,
    'SELECT with LIKE on question_text' as query_pattern,
    'Consider full-text search or proper indexing' as recommendation
UNION ALL
SELECT 
    'user_answers_history' as query_type,
    'JOIN with ORDER BY and LIMIT' as query_pattern,
    'Use composite index on (user_id, created_at)' as recommendation
UNION ALL
SELECT 
    'progress_nested_subquery' as query_type,
    'Multiple nested IN subqueries' as query_pattern,
    'Replace with JOIN or EXISTS' as recommendation;

-- 5.2 表大小监控视图
CREATE OR REPLACE VIEW v_table_sizes AS
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS table_size_mb,
    ROUND((data_length / 1024 / 1024), 2) AS data_size_mb,
    ROUND((index_length / 1024 / 1024), 2) AS index_size_mb,
    table_rows,
    ROUND((index_length / data_length * 100), 2) AS index_ratio_percent
FROM information_schema.tables
WHERE table_schema = DATABASE()
AND table_name IN ('questions', 'user_answers', 'users', 'user_favorites', 'study_plans', 'user_notes')
ORDER BY (data_length + index_length) DESC;

-- 5.3 索引使用情况监控视图
CREATE OR REPLACE VIEW v_index_usage AS
SELECT 
    table_name,
    index_name,
    seq_in_index,
    column_name,
    cardinality,
    CASE 
        WHEN cardinality = 0 THEN 'Low selectivity'
        WHEN cardinality < 10 THEN 'Very low selectivity'
        WHEN cardinality < 100 THEN 'Low selectivity'
        WHEN cardinality < 1000 THEN 'Medium selectivity'
        ELSE 'High selectivity'
    END as selectivity_level
FROM information_schema.statistics
WHERE table_schema = DATABASE()
ORDER BY table_name, index_name, seq_in_index;

-- ========================================
-- 6. 分区表建议（可选）
-- ========================================

-- 6.1 用户答题记录按时间分区（示例）
/*
-- 如果user_answers表数据量很大，可以考虑按时间分区
ALTER TABLE user_answers 
PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2022 VALUES LESS THAN (2023),
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
*/

-- ========================================
-- 7. 缓存优化建议
-- ========================================

-- 7.1 创建缓存统计表
CREATE TABLE IF NOT EXISTS cache_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cache_key VARCHAR(255) NOT NULL,
    cache_type ENUM('query', 'user', 'content') NOT NULL,
    hit_count INT DEFAULT 0,
    miss_count INT DEFAULT 0,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_cache_key (cache_key),
    INDEX idx_cache_type (cache_type),
    INDEX idx_last_accessed (last_accessed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='缓存统计表';

-- ========================================
-- 8. 数据清理和归档
-- ========================================

-- 8.1 创建数据清理存储过程
DELIMITER $$
CREATE PROCEDURE CleanupOldData()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- 清理30天前的验证码
    DELETE FROM sms_verification 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
    
    -- 清理90天前的使用日志
    DELETE FROM user_usage_logs 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
    
    -- 归档6个月前的答题记录到历史表
    INSERT INTO user_answers_archive 
    SELECT * FROM user_answers 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);
    
    DELETE FROM user_answers 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);
    
    COMMIT;
    
    -- 优化表
    OPTIMIZE TABLE user_answers;
    OPTIMIZE TABLE sms_verification;
    OPTIMIZE TABLE user_usage_logs;
    
    SELECT CONCAT('Data cleanup completed at ', NOW()) as result;
    
END$$
DELIMITER ;

-- 8.2 创建答题记录归档表
CREATE TABLE IF NOT EXISTS user_answers_archive (
    id INT NOT NULL,
    user_id INT NOT NULL,
    session_id VARCHAR(255),
    question_id INT NOT NULL,
    submitted_answer VARCHAR(255) NOT NULL,
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id, created_at),
    INDEX idx_user_id (user_id),
    INDEX idx_question_id (question_id),
    INDEX idx_archived_at (archived_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户答题记录归档表'
PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2022 VALUES LESS THAN (2023),
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- ========================================
-- 9. 执行分析和优化
-- ========================================

-- 9.1 分析表统计信息
ANALYZE TABLE questions;
ANALYZE TABLE user_answers;
ANALYZE TABLE users;
ANALYZE TABLE user_favorites;
ANALYZE TABLE study_plans;
ANALYZE TABLE user_notes;

-- 9.2 优化表结构
OPTIMIZE TABLE questions;
OPTIMIZE TABLE user_answers;
OPTIMIZE TABLE users;
OPTIMIZE TABLE user_favorites;

-- ========================================
-- 10. 完成报告
-- ========================================

SELECT '🎯 数据库性能优化完成！' as status;
SELECT '📊 建议监控慢查询日志和定期运行 ANALYZE TABLE' as maintenance_tip;
SELECT '🔍 使用 v_table_sizes 视图监控表大小变化' as monitoring_tip;
SELECT '⚡ 考虑为大表实施分区策略' as scaling_tip;