-- ========================================
-- Law-Exam-Assistant 查询优化示例
-- ========================================

-- ========================================
-- 1. 题目搜索查询优化
-- ========================================

-- 原始查询（性能较差）
/*
SELECT * FROM questions 
WHERE subject = '民法' 
AND year IN (2023, 2024) 
AND question_text LIKE '%合同%' 
ORDER BY id 
LIMIT 10 OFFSET 20;
*/

-- 优化后查询
-- 1.1 使用复合索引的优化查询
SELECT id, question_code, subject, year, question_type, 
       question_text, options_json, correct_answer, explanation_text
FROM questions 
WHERE subject = '民法' 
AND year IN (2023, 2024) 
AND question_text LIKE '%合同%'
ORDER BY year DESC, id
LIMIT 10 OFFSET 20;

-- 1.2 分离计数查询和数据查询
-- 计数查询（用于分页信息）
SELECT COUNT(*) as total
FROM questions 
WHERE subject = '民法' 
AND year IN (2023, 2024) 
AND question_text LIKE '%合同%';

-- 数据查询（使用子查询优化）
SELECT q.id, q.question_code, q.subject, q.year, q.question_type, 
       q.question_text, q.options_json, q.correct_answer, q.explanation_text
FROM questions q
WHERE q.id IN (
    SELECT id FROM questions 
    WHERE subject = '民法' 
    AND year IN (2023, 2024) 
    AND question_text LIKE '%合同%'
    ORDER BY year DESC, id
    LIMIT 10 OFFSET 20
);

-- ========================================
-- 2. 用户答题历史查询优化
-- ========================================

-- 原始查询（多个子查询，性能差）
/*
SELECT question_id, created_at 
FROM user_answers 
WHERE user_id = ? 
AND question_id IN (SELECT id FROM questions WHERE subject = ?)
AND question_id IN (SELECT id FROM questions WHERE year = ?)
ORDER BY created_at DESC LIMIT 1;
*/

-- 优化后查询（使用JOIN）
SELECT ua.question_id, ua.created_at, q.subject, q.year
FROM user_answers ua
INNER JOIN questions q ON ua.question_id = q.id
WHERE ua.user_id = ?
AND q.subject = ?
AND q.year = ?
ORDER BY ua.created_at DESC 
LIMIT 1;

-- 更进一步优化：使用存储过程
CALL GetUserAnswerHistory(?, NULL, ?, ?, 1);

-- ========================================
-- 3. 答题历史统计查询优化
-- ========================================

-- 原始查询（性能差，重复扫描）
/*
SELECT 
    a.question_id, 
    a.submitted_answer,
    a.is_correct,
    a.created_at,
    q.question_type,
    q.correct_answer,
    q.explanation_text
FROM user_answers a
JOIN questions q ON a.question_id = q.id
WHERE a.user_id = ? OR a.session_id = ?
ORDER BY a.question_id ASC;
*/

-- 优化后查询（使用UNION ALL分别处理）
(SELECT 
    ua.question_id, 
    ua.submitted_answer,
    ua.is_correct,
    ua.created_at,
    q.question_type,
    q.correct_answer,
    q.explanation_text,
    'user' as source_type
FROM user_answers ua
INNER JOIN questions q ON ua.question_id = q.id
WHERE ua.user_id = ?
)
UNION ALL
(SELECT 
    ua.question_id, 
    ua.submitted_answer,
    ua.is_correct,
    ua.created_at,
    q.question_type,
    q.correct_answer,
    q.explanation_text,
    'session' as source_type
FROM user_answers ua
INNER JOIN questions q ON ua.question_id = q.id
WHERE ua.session_id = ? AND ua.user_id IS NULL
)
ORDER BY question_id ASC;

-- ========================================
-- 4. 收藏题目查询优化
-- ========================================

-- 原始查询
/*
SELECT 
    q.id, q.question_code, q.subject, q.year, 
    q.question_type, q.question_text, q.options_json,
    q.correct_answer, q.explanation_text
FROM user_favorites f
JOIN questions q ON f.question_id = q.id
WHERE f.user_id = ?
ORDER BY f.id DESC;
*/

-- 优化后查询（添加索引提示）
SELECT /*+ USE_INDEX(f, idx_user_favorites_user_time) */
    q.id, q.question_code, q.subject, q.year, 
    q.question_type, q.question_text, q.options_json,
    q.correct_answer, q.explanation_text
FROM user_favorites f
INNER JOIN questions q ON f.question_id = q.id
WHERE f.user_id = ?
ORDER BY f.created_at DESC;

-- 分页优化版本
SELECT q.id, q.question_code, q.subject, q.year, 
       q.question_type, q.question_text, q.options_json,
       q.correct_answer, q.explanation_text
FROM user_favorites f
INNER JOIN questions q ON f.question_id = q.id
WHERE f.user_id = ?
AND f.created_at <= ?  -- 使用游标分页代替OFFSET
ORDER BY f.created_at DESC
LIMIT 10;

-- ========================================
-- 5. 复杂统计查询优化
-- ========================================

-- 5.1 用户学习统计查询优化
-- 原始查询（多次扫描同一表）
/*
SELECT 
    u.user_id,
    (SELECT COUNT(*) FROM user_answers WHERE user_id = u.user_id) as total_answers,
    (SELECT COUNT(*) FROM user_answers WHERE user_id = u.user_id AND is_correct = 1) as correct_answers,
    (SELECT COUNT(*) FROM user_favorites WHERE user_id = u.user_id) as favorites_count
FROM users u
WHERE u.user_id = ?;
*/

-- 优化后查询（使用LEFT JOIN）
SELECT 
    u.user_id,
    COALESCE(stats.total_answers, 0) as total_answers,
    COALESCE(stats.correct_answers, 0) as correct_answers,
    COALESCE(fav.favorites_count, 0) as favorites_count,
    CASE 
        WHEN stats.total_answers > 0 
        THEN ROUND(stats.correct_answers * 100.0 / stats.total_answers, 2)
        ELSE 0 
    END as accuracy_rate
FROM users u
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_answers,
        SUM(is_correct) as correct_answers
    FROM user_answers 
    WHERE user_id = ?
    GROUP BY user_id
) stats ON u.user_id = stats.user_id
LEFT JOIN (
    SELECT user_id, COUNT(*) as favorites_count
    FROM user_favorites 
    WHERE user_id = ?
    GROUP BY user_id
) fav ON u.user_id = fav.user_id
WHERE u.user_id = ?;

-- 更优化：使用视图
SELECT * FROM v_user_study_summary WHERE user_id = ?;

-- ========================================
-- 6. 全文搜索优化
-- ========================================

-- 6.1 创建全文索引（如果支持）
-- ALTER TABLE questions ADD FULLTEXT(question_text, explanation_text);

-- 6.2 使用全文搜索替代LIKE查询
-- 原始查询
/*
SELECT * FROM questions 
WHERE question_text LIKE '%合同订立%' 
OR options_json LIKE '%合同订立%';
*/

-- 优化后查询（使用全文搜索）
/*
SELECT *, MATCH(question_text, explanation_text) AGAINST ('合同订立' IN NATURAL LANGUAGE MODE) as relevance
FROM questions 
WHERE MATCH(question_text, explanation_text) AGAINST ('合同订立' IN NATURAL LANGUAGE MODE)
ORDER BY relevance DESC;
*/

-- 如果不支持全文索引，使用优化的LIKE查询
SELECT *
FROM questions 
WHERE (
    subject = '民法' 
    AND (question_text LIKE '%合同订立%' OR options_json LIKE '%合同订立%')
)
OR (
    subject = '民法' 
    AND question_text REGEXP '合同.*订立|订立.*合同'
)
ORDER BY 
    CASE 
        WHEN question_text LIKE '%合同订立%' THEN 3
        WHEN question_text LIKE '%合同%' AND question_text LIKE '%订立%' THEN 2
        ELSE 1
    END DESC;

-- ========================================
-- 7. 分页查询优化
-- ========================================

-- 7.1 传统OFFSET分页（大偏移量时性能差）
/*
SELECT * FROM questions ORDER BY id LIMIT 10 OFFSET 10000;
*/

-- 7.2 游标分页优化（推荐）
-- 第一页
SELECT * FROM questions ORDER BY id LIMIT 10;

-- 后续页面（使用上一页最后一条记录的ID）
SELECT * FROM questions 
WHERE id > ? 
ORDER BY id LIMIT 10;

-- 7.3 复合排序的游标分页
-- 按年份降序，ID升序
SELECT * FROM questions 
WHERE (year, id) < (?, ?) 
ORDER BY year DESC, id ASC 
LIMIT 10;

-- ========================================
-- 8. JSON字段查询优化
-- ========================================

-- 8.1 原始JSON查询（性能差）
/*
SELECT * FROM questions 
WHERE JSON_EXTRACT(options_json, '$[0].text') LIKE '%答案%';
*/

-- 8.2 创建生成列和索引
ALTER TABLE questions 
ADD COLUMN first_option_text VARCHAR(500) 
GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(options_json, '$[0].text'))) VIRTUAL;

CREATE INDEX idx_questions_first_option ON questions (first_option_text);

-- 8.3 使用生成列查询
SELECT * FROM questions 
WHERE first_option_text LIKE '%答案%';

-- ========================================
-- 9. 批量插入优化
-- ========================================

-- 9.1 批量插入答题记录
INSERT INTO user_answers (user_id, session_id, question_id, submitted_answer, is_correct)
VALUES 
    (1, 'session1', 100, 'A', 1),
    (1, 'session1', 101, 'B', 0),
    (1, 'session1', 102, 'C', 1)
ON DUPLICATE KEY UPDATE
    submitted_answer = VALUES(submitted_answer),
    is_correct = VALUES(is_correct),
    updated_at = CURRENT_TIMESTAMP;

-- 9.2 批量更新用户统计
UPDATE users u
JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_answers,
        SUM(is_correct) as correct_answers
    FROM user_answers 
    WHERE created_at >= CURDATE()
    GROUP BY user_id
) daily_stats ON u.user_id = daily_stats.user_id
SET 
    u.daily_questions_answered = daily_stats.total_answers,
    u.daily_correct_answers = daily_stats.correct_answers;

-- ========================================
-- 10. 缓存查询示例
-- ========================================

-- 10.1 缓存热门题目查询
CREATE TABLE question_cache AS
SELECT 
    q.*,
    COALESCE(stats.total_attempts, 0) as popularity,
    COALESCE(stats.success_rate, 0) as difficulty_rating
FROM questions q
LEFT JOIN v_question_stats stats ON q.id = stats.id
WHERE stats.total_attempts >= 10
ORDER BY stats.total_attempts DESC;

-- 创建缓存表索引
CREATE INDEX idx_question_cache_popularity ON question_cache (popularity DESC);
CREATE INDEX idx_question_cache_subject_year ON question_cache (subject, year);

-- 10.2 使用缓存查询热门题目
SELECT * FROM question_cache 
WHERE subject = '民法' 
ORDER BY popularity DESC 
LIMIT 10;

-- ========================================
-- 性能监控查询
-- ========================================

-- 查看当前运行的查询
SHOW PROCESSLIST;

-- 查看表状态
SHOW TABLE STATUS LIKE 'questions';

-- 查看索引使用情况
SHOW INDEX FROM questions;

-- 分析查询执行计划
EXPLAIN SELECT * FROM questions WHERE subject = '民法' AND year = 2024;

-- 查看慢查询日志设置
SHOW VARIABLES LIKE 'slow_query%';

-- 显示InnoDB状态
SHOW ENGINE INNODB STATUS;