#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
测试文档处理流程
"""

import os
import sys
import json
from process_document import process_document

def main():
    """测试文档处理流程的主函数"""
    # 检查命令行参数
    if len(sys.argv) < 2:
        print("用法: python test_document_process.py <文档路径> [DeepSeek API密钥]")
        return
    
    # 获取文档路径
    document_path = sys.argv[1]
    if not os.path.exists(document_path):
        print(f"错误: 文件不存在 - {document_path}")
        return
    
    # 检查是否提供了API密钥
    api_key = None
    if len(sys.argv) >= 3:
        api_key = sys.argv[2]
        print("使用命令行提供的API密钥")
    else:
        api_key = os.getenv('DEEPSEEK_API_KEY')
        if api_key:
            print("使用环境变量中的API密钥")
        else:
            print("警告: 未提供API密钥，请确保环境变量中已设置DEEPSEEK_API_KEY或通过命令行参数提供")
    
    # 准备输出文件路径
    output_dir = "test_results"
    os.makedirs(output_dir, exist_ok=True)
    
    document_name = os.path.basename(document_path)
    output_path = os.path.join(output_dir, f"{os.path.splitext(document_name)[0]}_processed.json")
    
    print(f"开始处理文档: {document_path}")
    print(f"结果将保存至: {output_path}")
    
    # 调用处理函数
    try:
        result = process_document(
            document_path=document_path,
            segment_strategy="smart",  # 使用智能混合策略
            chunk_size=1000,
            overlap=100,
            api_key=api_key,
            output_path=output_path
        )
        
        # 打印处理结果摘要
        print("\n===== 处理结果摘要 =====")
        
        # 打印每个步骤的状态
        for step in result["processing_steps"]:
            status_symbol = "✅" if step["status"] == "success" else "⚠️" if step["status"] == "partial_success" else "❌"
            print(f"{status_symbol} {step['step']}: {step['message']}")
        
        # 如果有chunks信息，打印文本块数量和平均长度
        if "chunks" in result:
            chunks = result["chunks"]
            avg_length = sum(chunk["text_length"] for chunk in chunks) / len(chunks) if chunks else 0
            with_embeddings = sum(1 for chunk in chunks if chunk.get("has_embedding", False))
            
            print(f"\n总共 {len(chunks)} 个文本块:")
            print(f"- 平均长度: {avg_length:.1f} 字符")
            print(f"- 成功向量化: {with_embeddings} 个")
            print(f"- 失败向量化: {len(chunks) - with_embeddings} 个")
            
            # 打印前两个文本块的预览
            if chunks:
                print("\n文本块预览:")
                for i, chunk in enumerate(chunks[:2]):
                    print(f"块 {chunk['chunk_id']+1} ({chunk['text_length']} 字符):")
                    # 只显示前100个字符
                    print(f"  {chunk['text'][:100]}..." if len(chunk['text']) > 100 else chunk['text'])
                    if chunk.get("has_embedding", False):
                        print(f"  → 向量维度: {chunk.get('embedding_dim', 'N/A')}")
                    else:
                        print(f"  → 向量化失败: {chunk.get('error', '未知错误')}")
                    print()
            
        print(f"\n完整结果已保存到: {output_path}")
        
    except Exception as e:
        print(f"处理过程中发生错误: {str(e)}")

if __name__ == "__main__":
    main() 