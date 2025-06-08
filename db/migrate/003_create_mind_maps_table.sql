-- 创建mind_maps表的迁移脚本
-- 执行方式：登录MySQL后使用 SOURCE /path/to/this/file.sql

USE law_exam_assistant;

-- 创建mind_maps表（与API需要的表名保持一致）
CREATE TABLE IF NOT EXISTS `mind_maps` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `subject_name` varchar(255) NOT NULL COMMENT '学科名称，如民法、刑法等',
  `map_data` json NOT NULL COMMENT '知识导图数据（JSON格式）',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `subject_name` (`subject_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='法考知识导图数据表';

-- 从现有的mindmaps表迁移数据（如果存在）
INSERT IGNORE INTO `mind_maps` (`subject_name`, `map_data`, `created_at`, `updated_at`)
SELECT `subject`, `content`, `created_at`, `updated_at` 
FROM `mindmaps` 
ON DUPLICATE KEY UPDATE 
  `map_data` = VALUES(`map_data`), 
  `updated_at` = CURRENT_TIMESTAMP;

-- 如果mindmaps表中没有数据，则导入民法知识导图示例数据
INSERT INTO `mind_maps` (`subject_name`, `map_data`) 
SELECT '民法', '{
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
    },
    {
      "name": "人格权法",
      "children": [
        { "name": "一般规定" },
        { "name": "生命权、身体权和健康权" },
        { "name": "姓名权和名称权" },
        { "name": "肖像权" },
        { "name": "名誉权和荣誉权" },
        { "name": "隐私权和个人信息保护" }
      ]
    }
  ]
}'
WHERE NOT EXISTS (SELECT 1 FROM `mind_maps` WHERE `subject_name` = '民法')
ON DUPLICATE KEY UPDATE `map_data` = VALUES(`map_data`), `updated_at` = CURRENT_TIMESTAMP; 