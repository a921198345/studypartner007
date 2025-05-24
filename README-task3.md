# 任务3：知识导图后端 - OPML处理与API服务

本文档提供了完成任务3所需的全部步骤和说明。

## 一、配置数据库

### 1. 在宝塔面板中创建数据库表

1. 使用 `pma_admin` 用户登录 phpMyAdmin
2. 选择 `law_exam_assistant` 数据库
3. 点击"SQL"选项卡
4. 复制并粘贴 `scripts/create_mind_maps_table.sql` 文件中的SQL代码
5. 点击"执行"按钮

### 2. 配置API与数据库连接

1. 打开 `admin_api.py` 文件
2. 修改 `MYSQL_CONFIG` 中的配置:
   ```python
   MYSQL_CONFIG = {
       'host': '你的宝塔服务器IP',  # 修改为实际IP
       'port': 3306,
       'user': 'law_app_user',    # 应用程序用户
       'password': '你的密码',      # 修改为实际密码
       'database': 'law_exam_assistant'
   }
   ```

## 二、安装依赖

在项目根目录下，运行以下命令创建Python虚拟环境并安装所需依赖：

```bash
python3 -m venv venv_flask_api
source venv_flask_api/bin/activate
pip install flask mysql-connector-python
```

## 三、启动API服务

使用提供的脚本启动API服务：

```bash
./scripts/start_admin_api.sh
```

服务将在端口5002上运行，可通过 http://127.0.0.1:5002/ 访问。

## 四、测试API服务

使用提供的测试脚本测试API服务功能：

```bash
./scripts/test_admin_api.sh
```

测试脚本将测试以下功能：
1. API服务是否正常运行
2. 上传OPML文件功能
3. 获取学科列表功能
4. 获取特定学科知识导图功能

## 五、API接口说明

### 1. 上传OPML文件

- **URL**: `/admin/upload-opml`
- **方法**: POST
- **参数**:
  - `file`: OPML文件
  - `subject_name`: 学科名称
- **示例**:
  ```bash
  curl -X POST -F "file=@民法.opml" -F "subject_name=民法" http://127.0.0.1:5002/admin/upload-opml
  ```

### 2. 获取学科列表

- **URL**: `/api/mindmaps/list`
- **方法**: GET
- **示例**:
  ```bash
  curl http://127.0.0.1:5002/api/mindmaps/list
  ```

### 3. 获取特定学科知识导图

- **URL**: `/api/mindmaps/{subject}`
- **方法**: GET
- **参数**:
  - `subject`: URL中的学科名称
- **示例**:
  ```bash
  curl http://127.0.0.1:5002/api/mindmaps/民法
  ```

## 六、目录结构说明

- `admin_api.py`: API服务主程序
- `parse_opml.py`: OPML解析函数实现
- `public/uploads/opml`: OPML文件上传目录
- `scripts/`: 存放SQL脚本和测试脚本的目录
  - `create_mind_maps_table.sql`: 创建数据库表的SQL
  - `test_admin_api.sh`: 测试API服务的脚本
  - `start_admin_api.sh`: 启动API服务的脚本

## 七、重要说明

1. 默认情况下，API服务将尝试使用MySQL数据库。如果连接失败，会自动切换到SQLite数据库。
2. 确保宝塔面板中的 `law_app_user` 用户拥有 `law_exam_assistant` 数据库的适当权限。
3. 上传文件大小限制为10MB，如需更改可修改 `admin_api.py` 中的 `MAX_CONTENT_LENGTH` 配置。 