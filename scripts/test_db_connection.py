#!/usr/bin/env python3
"""
测试数据库连接脚本
用于验证law_app_user是否可以正确连接到law_exam_assistant数据库
"""

import sys
import json

try:
    import mysql.connector
except ImportError:
    print("错误: 缺少mysql-connector-python库")
    print("请运行: pip install mysql-connector-python")
    sys.exit(1)

# 数据库配置 - 请修改为实际的配置信息
config = {
    'host': '你的宝塔服务器IP',
    'port': 3306,
    'user': 'law_app_user',
    'password': '你的密码',
    'database': 'law_exam_assistant'
}

print(f"尝试连接到MySQL数据库: {config['host']}:{config['port']}")
print(f"用户: {config['user']}")
print(f"数据库: {config['database']}")

try:
    # 建立连接
    conn = mysql.connector.connect(**config)
    
    if conn.is_connected():
        print(f"\n连接成功! 服务器版本: {conn.get_server_info()}")
        
        # 创建光标对象
        cursor = conn.cursor()
        
        # 检查数据库版本
        cursor.execute("SELECT VERSION()")
        db_version = cursor.fetchone()
        print(f"数据库版本: {db_version[0]}")
        
        # 检查表
        print("\n检查数据库表:")
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        
        if not tables:
            print("警告: 数据库中没有找到任何表")
        else:
            print("数据库中的表:")
            for table in tables:
                print(f"  - {table[0]}")
                
                # 如果是mind_maps表，检查其结构
                if table[0] == 'mind_maps':
                    print("\n检查mind_maps表结构:")
                    cursor.execute(f"DESCRIBE {table[0]}")
                    columns = cursor.fetchall()
                    for column in columns:
                        print(f"  {column[0]} - {column[1]} - {column[2]} - {column[3]}")
                    
                    # 检查记录数
                    cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
                    count = cursor.fetchone()[0]
                    print(f"\nmind_maps表中有 {count} 条记录")
                    
                    if count > 0:
                        # 查看前3条记录(只显示ID和学科名称)
                        cursor.execute(f"SELECT id, subject_name FROM {table[0]} LIMIT 3")
                        records = cursor.fetchall()
                        print("前3条记录:")
                        for record in records:
                            print(f"  ID: {record[0]}, 学科: {record[1]}")
        
except mysql.connector.Error as e:
    print(f"\n错误: 无法连接到MySQL数据库")
    print(f"错误信息: {e}")
    sys.exit(1)
finally:
    # 关闭连接
    if 'conn' in locals() and conn.is_connected():
        cursor.close()
        conn.close()
        print("\n数据库连接已关闭") 