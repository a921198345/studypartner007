#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
文档处理流程
整合了文本提取、分段和向量化的完整流程
"""

import os
import json
from typing import List, Dict, Any, Optional

# 导入文本提取模块
try:
    from parse_docx import extract_text_from_word
    DOCX_PARSER_AVAILABLE = True
    print("成功导入Word文档解析模块")
except ImportError:
    DOCX_PARSER_AVAILABLE = False
    print("警告: parse_docx模块未找到，Word文档解析功能不可用")

# 导入文本分段模块
try:
    from text_segmentation import segment_text
    TEXT_SEGMENTATION_AVAILABLE = True
    print("成功导入文本分段模块")
except ImportError:
    TEXT_SEGMENTATION_AVAILABLE = False
    print("警告: text_segmentation模块未找到，文本分段功能不可用")

# 导入向量化模块
try:
    from lib.embeddings import get_embeddings_from_deepseek
    EMBEDDINGS_AVAILABLE = True
    print("成功导入向量化模块")
except ImportError:
    EMBEDDINGS_AVAILABLE = False
    print("警告: lib.embeddings模块未找到，向量化功能不可用")

def process_document(
    document_path: str,
    segment_strategy: str = 'smart',
    chunk_size: int = 1000,
    overlap: int = 100,
    api_key: Optional[str] = None,
    output_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    处理文档的完整流程：提取文本、分段和向量化
    
    参数:
        document_path (str): 文档文件路径
        segment_strategy (str): 分段策略，可选值：'fixed_length'、'paragraph'、'combined'或'smart'
        chunk_size (int): 文本块的最大字符数
        overlap (int): 相邻文本块的重叠字符数
        api_key (str, optional): DeepSeek API密钥，如不提供则尝试从环境变量获取
        output_path (str, optional): 结果输出的JSON文件路径，如不提供则不保存文件
        
    返回:
        Dict[str, Any]: 处理结果，包含原始文本、分段和向量化信息
    """
    # 验证模块可用性
    if not DOCX_PARSER_AVAILABLE:
        raise ImportError("无法进行文档处理：parse_docx模块未找到")
    if not TEXT_SEGMENTATION_AVAILABLE:
        raise ImportError("无法进行文档处理：text_segmentation模块未找到")
    if not EMBEDDINGS_AVAILABLE:
        raise ImportError("无法进行文档处理：lib.embeddings模块未找到")
    
    # 验证文件存在
    if not os.path.exists(document_path):
        raise FileNotFoundError(f"文件未找到: {document_path}")
    
    # 准备结果字典
    result = {
        "document_path": document_path,
        "document_name": os.path.basename(document_path),
        "segment_strategy": segment_strategy,
        "chunk_size": chunk_size,
        "overlap": overlap,
        "processing_steps": []
    }
    
    # 第1步：提取文本
    print(f"正在从文档提取文本: {document_path}")
    try:
        full_text = extract_text_from_word(document_path)
        result["processing_steps"].append({
            "step": "text_extraction",
            "status": "success",
            "text_length": len(full_text),
            "message": "文本提取成功"
        })
        print(f"文本提取成功，共 {len(full_text)} 个字符")
    except Exception as e:
        error_msg = f"文本提取失败: {str(e)}"
        result["processing_steps"].append({
            "step": "text_extraction",
            "status": "error",
            "message": error_msg
        })
        print(error_msg)
        return result
    
    # 第2步：文本分段
    print(f"正在对文本进行分段，使用策略: {segment_strategy}")
    try:
        text_chunks = segment_text(full_text, strategy=segment_strategy, 
                                  chunk_size=chunk_size, overlap=overlap)
        result["processing_steps"].append({
            "step": "text_segmentation",
            "status": "success",
            "chunks_count": len(text_chunks),
            "message": "文本分段成功"
        })
        print(f"文本分段成功，共分成 {len(text_chunks)} 个文本块")
    except Exception as e:
        error_msg = f"文本分段失败: {str(e)}"
        result["processing_steps"].append({
            "step": "text_segmentation",
            "status": "error",
            "message": error_msg
        })
        print(error_msg)
        return result
    
    # 第3步：向量化
    print("正在对文本块进行向量化...")
    try:
        embedding_results = get_embeddings_from_deepseek(text_chunks, api_key=api_key)
        
        # 统计成功和失败的数量
        successful = sum(1 for item in embedding_results if item['embedding'] is not None)
        failed = len(embedding_results) - successful
        
        result["processing_steps"].append({
            "step": "vectorization",
            "status": "success" if failed == 0 else "partial_success",
            "successful_chunks": successful,
            "failed_chunks": failed,
            "message": "向量化完成" if failed == 0 else f"向量化部分完成，{failed}个文本块失败"
        })
        
        # 添加文本块和向量到结果中
        result["chunks"] = []
        for i, embed_result in enumerate(embedding_results):
            chunk_info = {
                "chunk_id": i,
                "text": embed_result["text"],
                "text_length": len(embed_result["text"]),
                "has_embedding": embed_result["embedding"] is not None
            }
            
            # 只包含向量维度信息，不包含完整向量（可能很大）
            if embed_result["embedding"] is not None:
                chunk_info["embedding_dim"] = len(embed_result["embedding"])
            else:
                chunk_info["error"] = embed_result.get("error", "未知错误")
            
            result["chunks"].append(chunk_info)
        
        # 添加完整向量数据（可选）
        result["embeddings"] = [
            {
                "chunk_id": i,
                "embedding": item["embedding"]
            }
            for i, item in enumerate(embedding_results) 
            if item["embedding"] is not None
        ]
        
        print(f"向量化处理完成: 成功 {successful} 个, 失败 {failed} 个")
        
    except Exception as e:
        error_msg = f"向量化处理失败: {str(e)}"
        result["processing_steps"].append({
            "step": "vectorization",
            "status": "error",
            "message": error_msg
        })
        print(error_msg)
    
    # 如果提供了输出路径，保存结果到JSON文件
    if output_path:
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f"处理结果已保存到: {output_path}")
        except Exception as e:
            print(f"保存结果文件失败: {str(e)}")
    
    return result

# 命令行运行
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="处理Word文档：提取文本、分段和向量化")
    parser.add_argument("document_path", help="Word文档的路径")
    parser.add_argument("--strategy", default="smart", choices=["fixed_length", "paragraph", "combined", "smart"],
                        help="文本分段策略")
    parser.add_argument("--chunk-size", type=int, default=1000, help="文本块的最大字符数")
    parser.add_argument("--overlap", type=int, default=100, help="相邻文本块的重叠字符数")
    parser.add_argument("--api-key", help="DeepSeek API密钥（如果不提供，将尝试从环境变量获取）")
    parser.add_argument("--output", help="处理结果输出的JSON文件路径")
    
    args = parser.parse_args()
    
    process_document(
        document_path=args.document_path,
        segment_strategy=args.strategy,
        chunk_size=args.chunk_size,
        overlap=args.overlap,
        api_key=args.api_key,
        output_path=args.output
    ) 