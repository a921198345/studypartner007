#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
从Word文档提取文本的模块
用于法考助手AI问答知识库构建
"""

import os
import docx
import traceback
from docx.opc.exceptions import PackageNotFoundError

def extract_text_from_word(word_file_path):
    """
    从Word文档中提取文本内容
    
    参数:
        word_file_path (str): Word文档的路径
        
    返回:
        str: 提取的文本内容
        
    异常:
        FileNotFoundError: 如果文件不存在
        ValueError: 如果文件格式不支持
        Exception: 其他错误
    """
    # 检查文件是否存在
    if not os.path.exists(word_file_path):
        raise FileNotFoundError(f"文件不存在: {word_file_path}")
    
    # 检查文件扩展名
    file_extension = os.path.splitext(word_file_path)[1].lower()
    if file_extension not in ['.docx', '.doc']:
        raise ValueError(f"不支持的文件格式: {file_extension}，仅支持.doc和.docx格式")
    
    # 尝试打开文档并提取文本
    try:
        # 使用python-docx库打开文档
        doc = docx.Document(word_file_path)
        
        # 提取所有段落文本
        full_text = []
        
        # 提取段落
        for para in doc.paragraphs:
            full_text.append(para.text)
        
        # 提取表格中的文本
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for paragraph in cell.paragraphs:
                        full_text.append(paragraph.text)
        
        # 将所有文本段落合并成一个字符串，用换行符分隔
        return '\n'.join(full_text)
    
    except PackageNotFoundError:
        raise ValueError("无法打开文件，可能是文件格式不兼容或文件已损坏")
    except Exception as e:
        # 记录详细错误信息
        error_msg = f"提取文本时发生错误: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)  # 输出到控制台方便调试
        raise Exception(f"提取文本失败: {str(e)}")

if __name__ == "__main__":
    # 简单的测试代码
    import sys
    
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        try:
            text = extract_text_from_word(file_path)
            print(f"成功提取文本，共 {len(text)} 个字符")
            print("文本预览（前500个字符）:")
            print(text[:500] + "...")
        except Exception as e:
            print(f"错误: {str(e)}")
    else:
        print("使用方法: python parse_docx.py <word文件路径>") 