from flask import Flask, request, jsonify, render_template_string # 增加了 render_template_string
import os # 导入os模块，用于文件操作
import inspect # 导入 inspect 模块用于获取函数信息
import json # 用于处理JSON数据
import traceback # 用于详细错误追踪
import sqlite3 # 用于SQLite数据库
import datetime # 用于处理日期时间

# 尝试导入MySQL连接器，如果不可用则跳过
try:
    import mysql.connector
    from mysql.connector import Error as MySQLError
    MYSQL_AVAILABLE = True
except ImportError:
    MYSQL_AVAILABLE = False
    MySQLError = Exception  # 定义一个占位符

# =================================================================
# ======================== 数据库配置区域 ==========================
# =================================================================
# 数据库类型：可以是 "mysql" 或 "sqlite"
# 如果MySQL连接失败，将自动切换到SQLite
DATABASE_TYPE = "mysql"  # 强制使用MySQL连接到宝塔面板

# MySQL配置
MYSQL_CONFIG = {
    'host': '8.141.4.192',        # 宝塔面板服务器的IP地址或域名
    'port': 3306,                    # MySQL端口，宝塔面板默认是3306
    'user': 'law_app_user',          # 宝塔面板中的应用程序用户
    'password': 'Accd0726351x.',            # law_app_user的密码
    'database': 'law_exam_assistant' # 宝塔面板中的数据库名称
}

# SQLite配置
SQLITE_DB_PATH = os.path.join("data", "law_exam_assistant.db")
# =================================================================

# --- 导入 parse_opml_to_json_tree ---
imported_parse_function_info = "未定义 (导入前)"
parse_opml_function_to_use = None

try:
    from parse_opml import parse_opml_to_json_tree
    parse_opml_function_to_use = parse_opml_to_json_tree
    imported_parse_function_info = f"成功从 parse_opml 模块导入: {inspect.getmodule(parse_opml_to_json_tree).__name__}.{parse_opml_to_json_tree.__name__}"
except ImportError as e:
    # 找不到模块或函数
    imported_parse_function_info = f"导入错误: {str(e)}"

app = Flask(__name__) # 创建一个Flask应用实例

# 确保数据目录存在
os.makedirs(os.path.dirname(SQLITE_DB_PATH), exist_ok=True)

# 初始化SQLite数据库
def init_sqlite_db():
    """创建SQLite数据库表结构"""
    try:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        
        # 创建mind_maps表
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS mind_maps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_name TEXT NOT NULL UNIQUE,
            map_data TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        conn.commit()
        cursor.close()
        conn.close()
        return True, "SQLite数据库初始化成功"
    except Exception as e:
        return False, f"SQLite数据库初始化失败: {str(e)}"

# 测试数据库连接
def test_db_connection():
    """测试与数据库的连接，返回(布尔值, 字符串消息, 数据库类型)"""
    global DATABASE_TYPE
    
    # 尝试连接MySQL
    if MYSQL_AVAILABLE and DATABASE_TYPE == "mysql":
        try:
            print(f"尝试连接到宝塔MySQL: {MYSQL_CONFIG['host']}:{MYSQL_CONFIG.get('port', 3306)}, 用户: {MYSQL_CONFIG['user']}, 数据库: {MYSQL_CONFIG['database']}")
            conn = mysql.connector.connect(**MYSQL_CONFIG)
            if conn.is_connected():
                print(f"宝塔MySQL连接成功: 服务器版本 {conn.get_server_info()}")
                cursor = conn.cursor()
                cursor.execute("SHOW TABLES")
                tables = cursor.fetchall()
                print(f"数据库中的表: {tables}")
                cursor.close()
                conn.close()
                return True, "宝塔MySQL数据库连接成功", "mysql"
        except Exception as e:
            error_message = f"宝塔MySQL连接失败: {str(e)}"
            print(error_message)
            print(f"配置: host={MYSQL_CONFIG['host']}, user={MYSQL_CONFIG['user']}, database={MYSQL_CONFIG['database']}")
            
            # 如果强制使用MySQL但连接失败，则返回错误状态
            if DATABASE_TYPE == "mysql":
                return False, f"宝塔MySQL连接失败: {str(e)}", "mysql"
    
    # 如果不强制使用MySQL或MYSQL_AVAILABLE为False
    if DATABASE_TYPE == "sqlite":
        success, message = init_sqlite_db()
        return success, f"使用SQLite数据库: {message}", "sqlite"
    else:
        # 默认返回MySQL失败状态
        return False, "MySQL不可用且未配置使用SQLite", "unknown"

# 保存知识导图数据到数据库
def save_mindmap_to_db(subject_name, map_data):
    """
    将知识导图数据保存到数据库中
    
    Args:
        subject_name (str): 学科名称，如"民法"、"刑法"
        map_data (dict): 解析后的知识导图JSON数据
        
    Returns:
        dict: 包含操作结果的字典，格式为 {"success": bool, "message": str, "id": int}
    """
    result = {"success": False, "message": "", "id": None}
    
    # 将map_data字典转换为JSON字符串
    map_data_json = json.dumps(map_data, ensure_ascii=False)
    
    # 根据数据库类型执行不同的操作
    if DATABASE_TYPE == "mysql" and MYSQL_AVAILABLE:
        try:
            # 连接到MySQL数据库
            conn = mysql.connector.connect(**MYSQL_CONFIG)
            cursor = conn.cursor()
            
            # 检查是否已存在该学科的知识导图
            check_sql = "SELECT id FROM mind_maps WHERE subject_name = %s"
            cursor.execute(check_sql, (subject_name,))
            existing_record = cursor.fetchone()
            
            if existing_record:
                # 更新已存在的记录
                update_sql = """
                UPDATE mind_maps 
                SET map_data = %s, updated_at = CURRENT_TIMESTAMP 
                WHERE subject_name = %s
                """
                cursor.execute(update_sql, (map_data_json, subject_name))
                result["id"] = existing_record[0]
                result["message"] = f"已更新'{subject_name}'的知识导图数据"
            else:
                # 插入新记录
                insert_sql = """
                INSERT INTO mind_maps (subject_name, map_data)
                VALUES (%s, %s)
                """
                cursor.execute(insert_sql, (subject_name, map_data_json))
                result["id"] = cursor.lastrowid
                result["message"] = f"已成功保存'{subject_name}'的知识导图数据"
            
            # 提交事务
            conn.commit()
            result["success"] = True
            
        except Exception as e:
            # 捕获MySQL错误
            error_msg = str(e)
            result["message"] = f"MySQL数据库操作失败: {error_msg}"
            print(f"MySQL数据库错误: {error_msg}")
            print(traceback.format_exc())
        finally:
            # 无论如何关闭数据库连接
            if 'conn' in locals() and 'conn' in globals() and conn.is_connected():
                cursor.close()
                conn.close()
    else:
        # 使用SQLite
        try:
            conn = sqlite3.connect(SQLITE_DB_PATH)
            cursor = conn.cursor()
            
            # 检查是否已存在该学科的知识导图
            check_sql = "SELECT id FROM mind_maps WHERE subject_name = ?"
            cursor.execute(check_sql, (subject_name,))
            existing_record = cursor.fetchone()
            
            current_time = datetime.datetime.now().isoformat()
            
            if existing_record:
                # 更新已存在的记录
                update_sql = """
                UPDATE mind_maps 
                SET map_data = ?, updated_at = ?
                WHERE subject_name = ?
                """
                cursor.execute(update_sql, (map_data_json, current_time, subject_name))
                result["id"] = existing_record[0]
                result["message"] = f"已更新'{subject_name}'的知识导图数据"
            else:
                # 插入新记录
                insert_sql = """
                INSERT INTO mind_maps (subject_name, map_data, created_at, updated_at)
                VALUES (?, ?, ?, ?)
                """
                cursor.execute(insert_sql, (subject_name, map_data_json, current_time, current_time))
                result["id"] = cursor.lastrowid
                result["message"] = f"已成功保存'{subject_name}'的知识导图数据"
            
            # 提交事务
            conn.commit()
            result["success"] = True
            
        except Exception as e:
            # 捕获SQLite错误
            error_msg = str(e)
            result["message"] = f"SQLite数据库操作失败: {error_msg}"
            print(f"SQLite数据库错误: {error_msg}")
            print(traceback.format_exc())
        finally:
            # 无论如何关闭数据库连接
            if 'conn' in locals():
                cursor.close()
                conn.close()
    
    return result

# --- 应用启动时打印诊断信息 ---
print("--- Flask 应用启动诊断 ---")
print(f"试图导入的函数信息: {imported_parse_function_info}")
if parse_opml_function_to_use:
    print(f"将要使用的解析函数来源模块: {inspect.getmodule(parse_opml_function_to_use)}")
    print(f"将要使用的解析函数名称: {parse_opml_function_to_use.__name__}")
    if parse_opml_function_to_use.__name__ == 'placeholder_parser':
        print("注意：当前使用的是内部定义的占位符解析函数。")
    elif parse_opml_function_to_use.__name__ == 'parse_opml_to_json_tree':
        print("注意：当前看起来是导入了名为 parse_opml_to_json_tree 的函数。")
else:
    print("错误：没有任何解析函数被赋值给 parse_opml_function_to_use。")
print("--------------------------")

# 设置允许上传的文件大小 (例如，10MB)
# 1MB = 1 * 1024 * 1024 bytes
# 10MB = 10 * 1024 * 1024 bytes
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

# 定义文件上传的临时保存路径 (可选)
UPLOAD_FOLDER = 'public/uploads/opml_temp' # 确保这个文件夹存在，或者在代码中创建它
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# 确保上传文件夹存在
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# 添加根路径处理
@app.route('/')
def index():
    # 测试数据库连接
    db_success, db_message, db_type = test_db_connection()
    
    # 创建一个简单的HTML页面
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>法考知识导图 OPML 处理 API</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                line-height: 1.6;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
            }
            h1 { color: #333; }
            h2 { color: #0066cc; margin-top: 20px; }
            code { 
                background-color: #f5f5f5; 
                padding: 2px 4px; 
                border-radius: 4px;
                font-family: monospace;
            }
            pre {
                background-color: #f5f5f5;
                padding: 10px;
                border-radius: 4px;
                overflow-x: auto;
            }
            .endpoint {
                margin-bottom: 15px;
                border-left: 3px solid #0066cc;
                padding-left: 10px;
            }
            .method {
                font-weight: bold;
                color: #009900;
            }
            .url {
                font-weight: bold;
            }
            .test-db {
                margin-top: 30px;
                padding: 15px;
                background-color: #f8f8f8;
                border-radius: 4px;
                border: 1px solid #ddd;
            }
            .current-db {
                font-weight: bold;
                color: #0066cc;
            }
        </style>
    </head>
    <body>
        <h1>法考知识导图 OPML 处理 API</h1>
        
        <div class="test-db">
            <h3>数据库连接状态</h3>
            <p>
            """
    # 添加数据库连接状态
    if db_success:
        html_content += '<span style="color: green;">✅ ' + db_message + '</span>'
    else:
        html_content += '<span style="color: red;">❌ ' + db_message + '</span>'
    
    html_content += """
            </p>
            <p>当前使用的数据库类型: <span class="current-db">{db_type}</span></p>
        </div>

        <h2>API 端点</h2>
        
        <div class="endpoint">
            <p><span class="method">POST</span> <span class="url">/admin/upload-opml</span></p>
            <p>上传 OPML 文件并进行解析，返回JSON格式的知识树。同时尝试将解析后的数据保存到数据库中。</p>
            <p><strong>参数:</strong></p>
            <ul>
                <li><code>file</code>: OPML 文件 (必须)</li>
                <li><code>subject_name</code>: 学科名称，例如"民法" (可选，如不提供将从OPML中提取)</li>
            </ul>
            <p><strong>示例:</strong></p>
            <pre>curl -X POST -F "file=@民法.opml" -F "subject_name=民法" http://127.0.0.1:5001/admin/upload-opml</pre>
        </div>

        <div class="endpoint">
            <p><span class="method">GET</span> <span class="url">/api/mindmaps/list</span></p>
            <p>获取所有已存储的学科知识导图列表（不包含完整的导图数据）</p>
            <p><strong>示例:</strong></p>
            <pre>curl http://127.0.0.1:5001/api/mindmaps/list</pre>
        </div>

        <div class="endpoint">
            <p><span class="method">GET</span> <span class="url">/api/mindmaps/{{subject}}</span></p>
            <p>获取特定学科的完整知识导图数据</p>
            <p><strong>参数:</strong></p>
            <ul>
                <li><code>{{subject}}</code>: URL中的学科名称，例如"民法"</li>
            </ul>
            <p><strong>示例:</strong></p>
            <pre>curl http://127.0.0.1:5001/api/mindmaps/民法</pre>
        </div>

        <h2>解析函数导入状态</h2>
        <pre>{imported_parse_function_info}</pre>
        
    </body>
    </html>
    """.format(db_type=db_type.upper(), imported_parse_function_info=imported_parse_function_info)
    
    return render_template_string(html_content)

# API 端点，用于上传OPML文件
# 路径名使用小写字母和连字符，例如 /admin/upload-opml
@app.route('/admin/upload-opml', methods=['POST'])
def upload_opml_file_endpoint():
    # --- 端点调用时打印诊断信息 ---
    endpoint_parser_func = parse_opml_function_to_use # 获取当前上下文中实际指向的函数
    print("\n--- 端点 /admin/upload-opml 调用诊断 ---")
    if endpoint_parser_func:
        print(f"端点内实际调用的解析函数来源模块: {inspect.getmodule(endpoint_parser_func)}")
        print(f"端点内实际调用的解析函数名称: {endpoint_parser_func.__name__}")
        if endpoint_parser_func.__name__ == 'placeholder_parser':
            print("端点注意：调用的是内部定义的占位符解析函数。")
        elif endpoint_parser_func.__name__ == 'parse_opml_to_json_tree':
            print("端点注意：调用的是名为 parse_opml_to_json_tree 的函数。")
    else:
        print("端点错误：在端点内，parse_opml_function_to_use 未定义!")
        return jsonify({"error": "服务器配置错误：解析函数未初始化"}), 500
    print("------------------------------------")

    # 1. 检查请求中是否包含文件部分
    if 'file' not in request.files:
        return jsonify({"error": "请求中未找到文件部分 ('file')"}), 400 # 返回错误信息和400状态码

    uploaded_file = request.files['file'] # 获取上传的文件对象

    # 2. 检查文件名是否为空 (用户可能没有选择文件就提交了表单)
    if uploaded_file.filename == '':
        return jsonify({"error": "未选择任何文件"}), 400

    # 3. 获取学科名称 (来自表单数据)
    subject_name = request.form.get('subject_name') # 'subject_name' 对应前端表单中的字段名
    if not subject_name:
        return jsonify({"error": "未提供学科名称 (表单字段 'subject_name' 未找到)"}), 400

    # 4. 检查文件类型 (可选，但推荐)
    # 你可以检查文件名后缀是否为 .opml
    if not uploaded_file.filename.lower().endswith('.opml'):
        return jsonify({"error": "文件类型无效，请上传有效的OPML文件 (以 .opml 结尾)"}), 400
        
    # 文件大小校验已由 app.config['MAX_CONTENT_LENGTH'] 处理
    # 如果文件太大，Flask 会自动返回一个 413 Request Entity Too Large 错误

    # 至此，我们已经获取了文件和学科名称
    # 接下来是读取文件内容并调用解析函数

    try:
        # 5. 读取文件内容
        # uploaded_file.read() 会读取整个文件内容到内存
        # 对于非常大的文件，可以考虑流式处理或先保存到临时文件再读取
        opml_file_content_bytes = uploaded_file.read()
        opml_file_content_string = opml_file_content_bytes.decode('utf-8') # OPML 通常是 UTF-8 编码

        # (可选) 如果你配置了 UPLOAD_FOLDER 并想临时保存文件:
        # filename = os.path.join(app.config['UPLOAD_FOLDER'], uploaded_file.filename)
        # uploaded_file.save(filename) # 这会再次读取文件流，如果已经 read() 过，可能需要重置流指针或重新获取文件
        # with open(filename, 'r', encoding='utf-8') as f:
        #    opml_file_content_string = f.read()
        # os.remove(filename) # 解析完后删除临时文件

        # 6. 调用OPML解析函数 (子任务2的成果)
        # 注意：你需要确保 parse_opml_to_json_tree 函数已正确定义并导入
        parsed_data_from_opml = endpoint_parser_func(opml_file_content_string, subject_name)

        # 新增: 打印解析结果以供调试
        print(f"DEBUG: 解析函数返回的结果 (parsed_data_from_opml): {parsed_data_from_opml}")

        if isinstance(parsed_data_from_opml, dict) and parsed_data_from_opml.get("error"):
            actual_error_message = parsed_data_from_opml.get("error", "未提供具体的解析错误信息")
            app.logger.warning(f"OPML解析为学科 '{subject_name}' 时返回错误: {actual_error_message}")
        return jsonify({
                "message": "文件上传但解析失败",
                "uploaded_filename": uploaded_file.filename,
                "subject_processed": subject_name,
                    "parser_error_detail": actual_error_message # 使用新变量确保错误信息被传递
            }), 400

        # 7. 将解析后的数据保存到数据库
        db_result = save_mindmap_to_db(subject_name, parsed_data_from_opml)
        
        # 8. 返回解析后的JSON数据、存储状态和成功消息
        response_data = {
            "message": "文件上传成功并已解析",
            "uploaded_filename": uploaded_file.filename,
            "subject_processed": subject_name,
            "parsed_opml_data": parsed_data_from_opml,
            "database_storage": db_result
        }
        
        if not db_result["success"]:
            app.logger.warning(f"数据库存储失败: {db_result['message']}")
            # 即使数据库存储失败，我们仍然返回解析成功的结果，但添加一个警告
            response_data["warnings"] = ["数据已成功解析，但未能存储到数据库。这不影响当前操作，但可能影响后续功能。"]
        
        return jsonify(response_data), 200 # 200 OK 表示成功

    except UnicodeDecodeError:
        app.logger.error(f"文件解码错误，文件名: {uploaded_file.filename}")
        return jsonify({"error": "文件编码错误，请确保OPML文件为UTF-8编码"}), 400
    except Exception as e:
        app.logger.error(f"处理文件 '{uploaded_file.filename}' 时发生未知服务器错误: {str(e)}", exc_info=True)
        return jsonify({"error": f"处理文件时发生服务器内部错误，请联系管理员。"}), 500 # 500 Internal Server Error

# 添加一个新的API端点，用于获取所有学科知识导图列表
@app.route('/api/mindmaps/list', methods=['GET'])
def list_mindmaps_endpoint():
    """
    返回所有已存储在数据库中的学科知识导图的简要信息列表。
    不返回完整的知识导图数据，只返回学科名称、创建时间和更新时间等元数据。
    """
    mindmaps = []
    
    try:
        if DATABASE_TYPE == "mysql" and MYSQL_AVAILABLE:
            # 使用MySQL
            conn = mysql.connector.connect(**MYSQL_CONFIG)
            cursor = conn.cursor(dictionary=True)  # 返回字典格式的结果
            
            # 查询所有学科的基本信息，不包括完整的map_data
            sql = """
            SELECT id, subject_name, created_at, updated_at 
            FROM mind_maps 
            ORDER BY updated_at DESC
            """
            
            cursor.execute(sql)
            mindmaps = cursor.fetchall()
            
            # 关闭游标和连接
            cursor.close()
            conn.close()
            
            # 转换datetime对象为ISO格式字符串，以便JSON序列化
            for mindmap in mindmaps:
                if 'created_at' in mindmap and mindmap['created_at']:
                    mindmap['created_at'] = mindmap['created_at'].isoformat()
                if 'updated_at' in mindmap and mindmap['updated_at']:
                    mindmap['updated_at'] = mindmap['updated_at'].isoformat()
        else:
            # 使用SQLite
            conn = sqlite3.connect(SQLITE_DB_PATH)
            conn.row_factory = sqlite3.Row  # 使结果可以通过列名访问
            cursor = conn.cursor()
            
            # 查询所有学科的基本信息，不包括完整的map_data
            sql = """
            SELECT id, subject_name, created_at, updated_at 
            FROM mind_maps 
            ORDER BY updated_at DESC
            """
            
            cursor.execute(sql)
            rows = cursor.fetchall()
            
            # 将sqlite3.Row对象转换为字典
            for row in rows:
                mindmap = {}
                for key in row.keys():
                    mindmap[key] = row[key]
                mindmaps.append(mindmap)
            
            # 关闭游标和连接
            cursor.close()
            conn.close()
        
        return jsonify({
            'success': True,
            'mindmaps': mindmaps,
            'count': len(mindmaps),
            'database_type': DATABASE_TYPE
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'数据库错误: {str(e)}',
            'mindmaps': [],
            'database_type': DATABASE_TYPE
        }), 500

# 添加一个新的API端点，用于获取特定学科的知识导图数据
@app.route('/api/mindmaps/<subject>', methods=['GET'])
def get_mindmap_endpoint(subject):
    """
    返回指定学科的知识导图数据，包括完整的导图结构
    """
    mindmap = None
    
    try:
        if DATABASE_TYPE == "mysql" and MYSQL_AVAILABLE:
            # 使用MySQL
            conn = mysql.connector.connect(**MYSQL_CONFIG)
            cursor = conn.cursor(dictionary=True)  # 返回字典格式的结果
            
            # 查询特定学科的知识导图数据
            sql = """
            SELECT id, subject_name, map_data, created_at, updated_at 
            FROM mind_maps 
            WHERE subject_name = %s
            """
            
            cursor.execute(sql, (subject,))
            mindmap = cursor.fetchone()
            
            # 关闭游标和连接
            cursor.close()
            conn.close()
            
            # 转换datetime对象为ISO格式字符串，以便JSON序列化
            if mindmap:
                if 'created_at' in mindmap and mindmap['created_at']:
                    mindmap['created_at'] = mindmap['created_at'].isoformat()
                if 'updated_at' in mindmap and mindmap['updated_at']:
                    mindmap['updated_at'] = mindmap['updated_at'].isoformat()
        else:
            # 使用SQLite
            conn = sqlite3.connect(SQLITE_DB_PATH)
            conn.row_factory = sqlite3.Row  # 使结果可以通过列名访问
            cursor = conn.cursor()
            
            # 查询特定学科的知识导图数据
            sql = """
            SELECT id, subject_name, map_data, created_at, updated_at 
            FROM mind_maps 
            WHERE subject_name = ?
            """
            
            cursor.execute(sql, (subject,))
            row = cursor.fetchone()
            
            # 将sqlite3.Row对象转换为字典
            if row:
                mindmap = {}
                for key in row.keys():
                    mindmap[key] = row[key]
            
            # 关闭游标和连接
            cursor.close()
            conn.close()
        
        if not mindmap:
            return jsonify({
                'success': False,
                'message': f'未找到学科: {subject}',
                'mindmap': None,
                'database_type': DATABASE_TYPE
            }), 404
        
        # 将map_data从JSON字符串转换回Python字典
        try:
            mindmap['map_data'] = json.loads(mindmap['map_data'])
        except json.JSONDecodeError as e:
            return jsonify({
                'success': False,
                'message': f'解析知识导图数据失败: {str(e)}',
                'mindmap': None,
                'database_type': DATABASE_TYPE
            }), 500
        
        return jsonify({
            'success': True,
            'mindmap': mindmap,
            'database_type': DATABASE_TYPE
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'数据库错误: {str(e)}',
            'mindmap': None,
            'database_type': DATABASE_TYPE
        }), 500

if __name__ == '__main__':
    import logging
    logging.basicConfig(level=logging.INFO)
    # 注意：Flask应用启动时的诊断打印会在这里执行，因为模块在运行前会被加载
    app.logger.info("Flask Admin API 服务准备启动 (主程序块)...")
    # 初始化数据库
    if DATABASE_TYPE == "sqlite":
        init_sqlite_db()
    
    print(f"使用 {DATABASE_TYPE.upper()} 数据库")
    # 启动Flask开发服务器
    # debug=True 表示开启调试模式，这样修改代码后服务器会自动重启
    # 在生产环境中，你应该使用更专业的WSGI服务器，而不是Flask自带的开发服务器
    app.run(debug=True, port=5002) # 使用端口5002
    app.logger.info("Flask Admin API 服务已停止。")
