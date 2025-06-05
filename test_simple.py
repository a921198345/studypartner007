#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
简单测试宪法文档分段
"""

import os
from text_segmentation import LegalDocumentSegmenter

def extract_text_from_docx(file_path):
    """从Word文档中提取文本"""
    try:
        import docx
        doc = docx.Document(file_path)
        full_text = []
        for para in doc.paragraphs:
            full_text.append(para.text)
        return '\n'.join(full_text)
    except Exception as e:
        print(f"提取文本出错: {e}")
        return None

def main():
    """主函数"""
    print("🚀 开始测试宪法文档分段")
    
    # 文件路径
    file_path = "宪法.docx"
    if not os.path.exists(file_path):
        print(f"❌ 错误: 未找到宪法文档 '{file_path}'")
        return
    
    # 提取文本
    print(f"📑 正在从 {file_path} 提取文本...")
    text = extract_text_from_docx(file_path)
    if not text:
        print("❌ 文本提取失败")
        return
    
    print(f"✅ 文本提取成功，共 {len(text)} 个字符")
    
    # 使用基础分段器
    print("🔍 使用基础法律结构分段器...")
    segmenter = LegalDocumentSegmenter()
    
    segments = segmenter.segment_by_legal_structure(text, "中华人民共和国宪法")
    
    print(f"✅ 分段完成，共生成 {len(segments)} 个分段")
    
    # 显示前5个分段
    print("\n📋 前5个分段预览:")
    for i, segment in enumerate(segments[:5], 1):
        print(f"\n分段 #{i}:")
        print(f"位置: {segment.book or ''} > {segment.chapter or ''} > 第{segment.article or '未识别'}条")
        print(f"内容: {segment.content[:100]}...")

if __name__ == "__main__":
    main() 