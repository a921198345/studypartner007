#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
法律文档处理脚本
用于提取Word文档内容，进行法律结构分段，生成向量嵌入等
"""

import os
import sys
import json
import argparse
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
        print("请安装python-docx库: pip install python-docx", file=sys.stderr)
        return None
    except Exception as e:
        print(f"提取文本出错: {e}", file=sys.stderr)
        return None

def process_document(file_path, law_name=None, doc_id=None):
    """处理法律文档的入口函数"""
    # 提取文件名（不含路径和扩展名）作为默认law_name
    if not law_name:
        base_name = os.path.basename(file_path)
        law_name = os.path.splitext(base_name)[0]
    
    # 生成默认文档ID
    if not doc_id:
        import time
        import random
        doc_id = f"doc_{int(time.time())}_{random.randint(100, 999)}"
    
    # 提取文本
    text = extract_text_from_docx(file_path)
    if not text:
        return {
            "success": False,
            "error": "无法提取文档文本",
            "doc_id": doc_id
        }
    
    # 使用法律结构分段器处理文本
    segmenter = LegalDocumentSegmenter()
    segments = segmenter.segment_by_legal_structure(text, law_name)
    
    # 检查是否有API密钥决定是否使用增强功能
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    use_ai = bool(api_key)
    
    # 准备存储到数据库的数据
    db_segments = []
    
    # 如果有API密钥，使用AI增强功能
    if use_ai:
        processor = AIEnhancedLegalProcessor(api_key)
        
        # 优化分段质量
        optimized_segments = processor.ai_optimize_segmentation(segments[:10])  # 仅处理前10个作为示例
        
        # 生成向量嵌入
        embeddings = processor.generate_embeddings(optimized_segments)
        
        for i, segment in enumerate(optimized_segments):
            # 找到对应的向量数据
            embedding_data = None
            for emb in embeddings:
                if emb.get("segment_id").endswith(f"_{segment.article or i}"):
                    embedding_data = emb
                    break
            
            if embedding_data:
                db_segments.append(embedding_data)
            else:
                # 默认处理没有找到对应向量的情况
                db_segments.append({
                    "content": segment.content,
                    "metadata": segment.to_dict()["metadata"],
                    "token_count": segment.token_count,
                    "key_concepts": []  # 基础版本没有关键概念提取
                })
    else:
        # 使用基础分段，没有向量嵌入
        for i, segment in enumerate(segments):
            db_segments.append({
                "content": segment.content,
                "metadata": segment.to_dict()["metadata"],
                "token_count": segment.token_count,
                "key_concepts": []  # 基础版本没有关键概念提取
            })
    
    # 提取一些元数据用于返回
    metadata = {
        "law_name": law_name,
        "total_characters": len(text),
        "ai_enhanced": use_ai
    }
    
    # 根据分段结果提取结构信息
    structure_info = extract_structure_metadata(segments)
    metadata.update(structure_info)
    
    # 构建返回结果
    result = {
        "success": True,
        "doc_id": doc_id,
        "segments_count": len(segments),
        "metadata": metadata
    }
    
    # 保存处理结果到临时文件
    output_file = f"temp_{doc_id}_segments.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(db_segments, f, ensure_ascii=False, indent=2)
    
    # 返回JSON格式结果
    return result

def extract_structure_metadata(segments):
    """从分段列表中提取结构元数据"""
    books = set(s.book for s in segments if s.book)
    chapters = set(s.chapter for s in segments if s.chapter)
    sections = set(s.section for s in segments if s.section)
    articles = set(s.article for s in segments if s.article)
    
    return {
        "books": list(books),
        "chapters": list(chapters),
        "sections": list(sections),
        "articles": list(articles),
        "books_count": len(books),
        "chapters_count": len(chapters),
        "sections_count": len(sections),
        "articles_count": len(articles)
    }

def main():
    """命令行入口"""
    parser = argparse.ArgumentParser(description='处理法律文档，提取文本，进行法律结构分段')
    parser.add_argument('--file', required=True, help='要处理的Word文档路径')
    parser.add_argument('--law_name', help='法律名称（可选）')
    parser.add_argument('--doc_id', help='文档ID（可选）')
    
    args = parser.parse_args()
    
    # 处理文档
    result = process_document(args.file, args.law_name, args.doc_id)
    
    # 将结果输出为JSON
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main() 