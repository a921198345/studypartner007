#!/usr/bin/env python
# -*- coding: utf-8 -*-

import subprocess
import sys
import os
import json

def test_parse_script():
    """直接测试parse_questions.py脚本"""
    
    # 配置
    python_path = "./venv_flask_api/bin/python"
    script_path = "parse_questions.py"
    test_file = "民法客观题.docx"
    subject = "民法"
    
    print(f"测试解析脚本")
    print(f"Python路径: {python_path}")
    print(f"脚本路径: {script_path}")
    print(f"测试文件: {test_file}")
    print(f"学科: {subject}")
    print("-" * 50)
    
    # 检查文件是否存在
    if not os.path.exists(test_file):
        print(f"错误: 文件 {test_file} 不存在")
        return
    
    if not os.path.exists(script_path):
        print(f"错误: 脚本 {script_path} 不存在")
        return
    
    # 构建命令
    cmd = [python_path, script_path, test_file, subject, "--output-json"]
    print(f"执行命令: {' '.join(cmd)}")
    print("-" * 50)
    
    try:
        # 执行命令
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        print(f"返回码: {result.returncode}")
        
        if result.stderr:
            print(f"\n标准错误输出:")
            print(result.stderr)
        
        if result.stdout:
            print(f"\n标准输出:")
            # 尝试解析JSON
            try:
                data = json.loads(result.stdout)
                print(json.dumps(data, ensure_ascii=False, indent=2))
                
                # 显示统计信息
                if data.get('success'):
                    print(f"\n解析成功!")
                    print(f"总题目数: {data.get('total_questions', 0)}")
                    print(f"成功解析: {data.get('parsed_questions', 0)}")
                    print(f"格式错误: {len(data.get('format_issues', {}))}")
                else:
                    print(f"\n解析失败: {data.get('error', '未知错误')}")
                    
            except json.JSONDecodeError as e:
                print(f"JSON解析错误: {e}")
                print(f"原始输出: {result.stdout[:500]}...")
                
    except subprocess.TimeoutExpired:
        print("错误: 脚本执行超时（30秒）")
    except Exception as e:
        print(f"错误: {type(e).__name__}: {e}")

if __name__ == "__main__":
    test_parse_script()