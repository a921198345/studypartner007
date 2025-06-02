#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
用于测试Word文档文本提取功能的脚本
"""

import os
import sys
from parse_docx import extract_text_from_word

def test_extraction(file_path):
    """测试从Word文档中提取文本"""
    print(f"测试文件: {file_path}")
    
    if not os.path.exists(file_path):
        print(f"错误: 文件不存在: {file_path}")
        return False
    
    try:
        print("开始提取文本...")
        text = extract_text_from_word(file_path)
        text_length = len(text)
        
        print(f"提取成功！共提取了 {text_length} 个字符")
        
        # 显示前200个字符的预览
        preview_length = min(200, text_length)
        print(f"\n文本预览 (前{preview_length}个字符):")
        print("-" * 50)
        print(text[:preview_length] + ("..." if text_length > preview_length else ""))
        print("-" * 50)
        
        return True
    
    except Exception as e:
        print(f"错误: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        test_extraction(file_path)
    else:
        print("使用方法: python test_parse_docx.py <word文件路径>")
        
        # 尝试在uploads目录中查找Word文档
        upload_dir = "uploads"
        if os.path.exists(upload_dir):
            files = [f for f in os.listdir(upload_dir) if f.endswith('.docx') or f.endswith('.doc')]
            if files:
                print("\n在uploads目录中找到以下Word文件:")
                for i, file in enumerate(files):
                    print(f"{i+1}. {file}")
                
                try:
                    choice = input("\n请选择一个文件进行测试 (输入编号): ")
                    index = int(choice) - 1
                    if 0 <= index < len(files):
                        selected_file = os.path.join(upload_dir, files[index])
                        test_extraction(selected_file)
                    else:
                        print("无效的选择")
                except ValueError:
                    print("请输入有效的数字")
            else:
                print(f"\n在{upload_dir}目录中没有找到Word文件")
                print("请先上传一个Word文档或指定一个文件路径") 