-- create_mind_maps_table.sql
-- 创建存储知识导图数据的SQL表结构

-- 法考知识导图数据库表创建SQL
-- 执行步骤：
-- 1. 在宝塔面板中，使用pma_admin登录phpMyAdmin
-- 2. 选择law_exam_assistant数据库
-- 3. 点击"SQL"选项卡
-- 4. 粘贴此SQL并执行

-- 如果表已存在，先删除
DROP TABLE IF EXISTS `mind_maps`;

-- 创建mind_maps表
CREATE TABLE `mind_maps` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `subject_name` varchar(255) NOT NULL,
  `map_data` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `subject_name` (`subject_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='法考知识导图数据';
