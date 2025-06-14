#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
测试修复后的解析脚本
"""

import subprocess
import json
import sys

def test_parse():
    # 测试解析刑法文件
    file_path = "/Users/acheng/Downloads/law-exam-assistant/uploads/刑法_1749471200053.docx"
    
    # 运行修复后的解析脚本
    cmd = [
        sys.executable,
        "parse_questions_web.py",
        file_path,
        "刑法",
        "--output-json"
    ]
    
    print("运行命令:", ' '.join(cmd))
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.stderr:
        print("\n标准错误输出:")
        print(result.stderr)
    
    if result.stdout:
        try:
            data = json.loads(result.stdout)
            if data.get('success'):
                print(f"\n解析成功！共解析 {data['parsed_questions']} 个题目")
                
                # 检查前5个题目的选项
                if 'questions' in data and len(data['questions']) > 0:
                    print("\n检查前5个题目的选项:")
                    for i, q in enumerate(data['questions'][:5]):
                        print(f"\n题目 {i+1} (题号: {q['question_id']}):")
                        print(f"题干: {q['question_text'][:50]}...")
                        
                        # 解析选项
                        options = json.loads(q['options'])
                        for key, value in options.items():
                            print(f"{key}: {value[:50]}...")
                            
                            # 检查是否还包含解析内容
                            if any(word in value for word in ['错误', '正确', '【答案】', '项是', '理由']):
                                print(f"  ⚠️ 警告: 选项{key}可能还包含解析内容！")
            else:
                print(f"\n解析失败: {data.get('error', '未知错误')}")
        except json.JSONDecodeError as e:
            print(f"\nJSON解析错误: {e}")
            print("原始输出:", result.stdout[:500])

if __name__ == "__main__":
    test_parse()