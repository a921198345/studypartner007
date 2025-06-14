#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
测试完整的上传处理流程
"""

import os
import shutil
import sys
import subprocess
import json

def test_upload_process(source_file, subject="民法"):
    """测试完整的文件上传和解析流程"""
    
    print(f"测试文件: {source_file}")
    print(f"学科: {subject}")
    print("=" * 60)
    
    # 1. 检查源文件
    if not os.path.exists(source_file):
        print(f"❌ 源文件不存在: {source_file}")
        return
    
    # 2. 创建临时文件（模拟上传）
    upload_dir = os.path.join(os.path.dirname(__file__), 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    
    temp_filename = f"{subject}_{int(os.urandom(6).hex(), 16)}.docx"
    temp_filepath = os.path.join(upload_dir, temp_filename)
    
    print(f"复制文件到: {temp_filepath}")
    try:
        shutil.copy2(source_file, temp_filepath)
        print("✅ 文件复制成功")
    except Exception as e:
        print(f"❌ 文件复制失败: {e}")
        return
    
    # 3. 执行解析脚本
    python_path = os.path.join(os.path.dirname(__file__), 'venv_flask_api/bin/python')
    script_path = os.path.join(os.path.dirname(__file__), 'parse_questions_smart.py')
    
    cmd = [python_path, script_path, temp_filepath, subject, '--output-json']
    print(f"\n执行命令: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        print(f"\n返回码: {result.returncode}")
        
        if result.stderr:
            print(f"\n标准错误输出:")
            print(result.stderr)
        
        if result.stdout:
            print(f"\n标准输出:")
            try:
                # 尝试解析JSON
                data = json.loads(result.stdout)
                print(json.dumps(data, ensure_ascii=False, indent=2))
            except:
                # 如果不是JSON，直接打印
                print(result.stdout)
                
    except subprocess.TimeoutExpired:
        print("❌ 命令执行超时")
    except Exception as e:
        print(f"❌ 执行命令失败: {e}")
    
    # 4. 清理（保留文件以便调试）
    print(f"\n临时文件保留在: {temp_filepath}")
    print("如需删除，请手动执行: rm " + temp_filepath)

if __name__ == "__main__":
    # 测试民法客观题文件
    test_file = "/Users/acheng/Downloads/law-exam-assistant/民法客观题.docx"
    test_upload_process(test_file, "民法")