# 知识导图500错误修复指南

## 问题分析
知识导图页面返回500错误的原因：
1. 数据库连接配置缺失
2. MySQL服务未启动
3. mind_maps表不存在

## 修复步骤

### 1. 配置数据库连接
在`.env`文件中添加数据库配置：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=law_exam_assistant
```

### 2. 确保MySQL服务运行
在宝塔面板中：
1. 进入"软件商店" → "已安装"
2. 找到MySQL，确保状态为"运行中"
3. 如果未运行，点击"启动"

### 3. 创建数据库和表

#### 方法1: 使用宝塔面板数据库管理
1. 在宝塔面板进入"数据库"
2. 创建数据库 `law_exam_assistant`
3. 进入phpMyAdmin
4. 选择数据库，执行以下SQL创建mind_maps表：

```sql
USE law_exam_assistant;

CREATE TABLE IF NOT EXISTS `mind_maps` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `subject_name` varchar(255) NOT NULL COMMENT '学科名称，如民法、刑法等',
  `map_data` json NOT NULL COMMENT '知识导图数据（JSON格式）',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `subject_name` (`subject_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='法考知识导图数据表';

-- 插入民法示例数据
INSERT INTO `mind_maps` (`subject_name`, `map_data`) VALUES 
('民法', '{
  "name": "民法",
  "children": [
    {
      "name": "民法总则",
      "children": [
        {"name": "基本规定"},
        {"name": "自然人"},
        {"name": "法人"},
        {"name": "民事法律行为"},
        {"name": "代理"},
        {"name": "民事权利"},
        {"name": "民事责任"},
        {"name": "诉讼时效"}
      ]
    },
    {
      "name": "物权法",
      "children": [
        {"name": "通则"},
        {"name": "所有权"},
        {"name": "用益物权"},
        {"name": "担保物权"},
        {"name": "占有"}
      ]
    },
    {
      "name": "合同法",
      "children": [
        {"name": "通则"},
        {"name": "合同的订立"},
        {"name": "合同的效力"},
        {"name": "合同的履行"},
        {"name": "合同的变更和转让"},
        {"name": "合同的权利义务终止"},
        {"name": "违约责任"}
      ]
    }
  ]
}');
```

#### 方法2: 使用命令行
```bash
# 进入项目目录
cd /www/wwwroot/your-domain

# 运行迁移脚本
mysql -u root -p law_exam_assistant < db/migrate/003_create_mind_maps_table.sql
```

### 4. 重启应用
在宝塔面板中重启Node.js应用或PM2进程。

### 5. 验证修复
访问知识导图页面，应该能正常显示民法知识导图。

## 常见问题

### Q: 数据库连接仍然失败
A: 检查MySQL用户权限，确保root用户可以连接localhost

### Q: JSON数据格式错误
A: 确保map_data字段包含有效的JSON格式数据

### Q: 缓存问题
A: 清除浏览器缓存或重启应用清除服务端缓存

## 测试方法
```bash
# 测试数据库连接
node -e "
const db = require('./lib/db.js');
db.testConnection().then(result => {
  console.log('数据库连接测试:', result ? '成功' : '失败');
  process.exit(0);
}).catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});
"
```