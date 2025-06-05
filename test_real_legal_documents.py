#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试真实法律文档的分段效果
"""

import os
import sys
import time
from text_segmentation import LegalDocumentSegmenter
from enhanced_legal_structure import AIEnhancedLegalProcessor

def extract_text_from_docx(file_path):
    """从Word文档中提取文本"""
    try:
        import docx
        doc = docx.Document(file_path)
        full_text = []
        for para in doc.paragraphs:
            full_text.append(para.text)
        return '\n'.join(full_text)
    except ImportError:
        print("请安装python-docx库: pip install python-docx")
        return None
    except Exception as e:
        print(f"提取文本出错: {e}")
        return None

def test_constitution():
    """测试宪法文档的分段效果"""
    print("\n" + "="*50)
    print("📜 测试宪法文档")
    print("="*50)
    
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
    print(f"📝 前200个字符预览: {text[:200].replace('
', ' ')}...")
    
    # 使用基础分段器
    print("\n🔍 使用基础法律结构分段器...")
    segmenter = LegalDocumentSegmenter()
    
    start_time = time.time()
    segments = segmenter.segment_by_legal_structure(text, "中华人民共和国宪法")
    end_time = time.time()
    
    print(f"✅ 分段完成，耗时 {end_time - start_time:.2f} 秒")
    print(f"📊 共生成 {len(segments)} 个分段")
    
    # 显示前5个分段
    print("\n📋 前5个分段预览:")
    for i, segment in enumerate(segments[:5], 1):
        print(f"\n分段 #{i}:")
        print(f"📍 位置: " + " > ".join(filter(None, [
            segment.book, 
            segment.chapter, 
            segment.section, 
            f"第{segment.article}条" if segment.article else None
        ])))
        print(f"📝 内容: {segment.content[:100].replace('
', ' ')}...")
    
    # 统计
    print("\n📊 分段统计:")
    books = set(s.book for s in segments if s.book)
    chapters = set(s.chapter for s in segments if s.chapter)
    sections = set(s.section for s in segments if s.section)
    articles = set(s.article for s in segments if s.article)
    
    print(f"📚 识别到的编数: {len(books)}")
    print(f"📖 识别到的章数: {len(chapters)}")
    print(f"📑 识别到的节数: {len(sections)}")
    print(f"📜 识别到的条数: {len(articles)}")
    
    return segments

def test_enhanced_processing(segments=None):
    """测试AI增强功能"""
    # 检查是否设置了API密钥
    if not os.environ.get("DEEPSEEK_API_KEY"):
        print("\n⚠️  警告: 未设置DEEPSEEK_API_KEY环境变量，AI增强功能可能不可用")
    
    print("\n" + "="*50)
    print("🤖 测试AI增强功能")
    print("="*50)
    
    if not segments:
        print("❌ 没有分段数据，跳过AI增强测试")
        return
    
    # 使用AI增强处理器
    processor = AIEnhancedLegalProcessor()
    
    # 测试一个小样本
    test_segments = segments[:3]  # 只取前3个分段进行测试
    
    print(f"🧪 对 {len(test_segments)} 个分段进行AI增强测试...")
    
    # 模拟向量化处理
    print("⚡ 测试向量化处理...")
    embeddings = processor.generate_embeddings(test_segments)
    
    print(f"✅ 向量化完成，生成 {len(embeddings)} 个向量")
    
    if len(embeddings) > 0:
        sample = embeddings[0]
        print(f"\n📊 向量样本:")
        print(f"🆔 ID: {sample['segment_id']}")
        print(f"📊 向量维度: {len(sample['embedding'])}")
        print(f"🔑 关键概念: {', '.join(sample.get('key_concepts', ['无关键概念'])[:3])}...")
    
    return embeddings

def main():
    """主函数"""
    print("🚀 开始测试真实法律文档")
    
    # 测试宪法文档
    segments = test_constitution()
    
    # 测试AI增强功能
    embeddings = test_enhanced_processing(segments)
    
    print("\n✨ 测试完成!")

if __name__ == "__main__":
    main() 