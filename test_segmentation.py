#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
文本分段策略测试脚本
用于测试和比较不同的文本分段策略效果
"""

import os
import sys
from text_segmentation import segment_text, segment_text_combined, segment_text_smart

def test_with_sample_text():
    """使用示例文本测试不同的分段策略"""
    # 准备一个有明显段落和句子结构的样本文本
    sample_text = """文本分段是自然语言处理中的一个基础任务，它将长文本分割成更小的单元以便于后续处理。
    
    好的分段策略应该考虑语义完整性。简单地按固定长度切分可能会破坏句子或段落的完整性，导致上下文信息丢失。而仅按段落分割又可能产生过长或过短的文本块，不利于向量化和检索。
    
    第三段是一个较长的段落，包含多个句子。这个段落的内容比较复杂，需要表达的信息较多。因此，它可能会被固定长度分段策略分成多个部分。如果我们使用智能混合分段策略，它应该能够在语义边界处进行分割，保持句子的完整性。同时还能确保生成的文本块大小适中，便于后续的向量化和检索。
    
    短段落1。
    
    短段落2。
    
    这是最后一个段落，用于测试我们的文本分段算法。理想的分段结果应该保持语义的连贯性，同时控制每个分段的大小在一个合理的范围内。"""
    
    print("样本文本长度:", len(sample_text), "字符")
    print("\n" + "="*50 + "\n")
    
    # 测试固定长度分段
    chunk_size = 100
    overlap = 20
    fixed_chunks = segment_text(sample_text, 'fixed_length', chunk_size, overlap)
    print(f"固定长度分段 (大小={chunk_size}, 重叠={overlap}):")
    print(f"生成了 {len(fixed_chunks)} 个文本块")
    for i, chunk in enumerate(fixed_chunks):
        print(f"\n块 {i+1} ({len(chunk)} 字符):")
        print(f"{chunk[:100]}..." if len(chunk) > 100 else chunk)
    
    print("\n" + "="*50 + "\n")
    
    # 测试段落分段
    para_chunks = segment_text(sample_text, 'paragraph')
    print("段落分段:")
    print(f"生成了 {len(para_chunks)} 个文本块")
    for i, chunk in enumerate(para_chunks):
        print(f"\n块 {i+1} ({len(chunk)} 字符):")
        print(f"{chunk[:100]}..." if len(chunk) > 100 else chunk)
    
    print("\n" + "="*50 + "\n")
    
    # 测试组合分段
    combined_chunks = segment_text_combined(sample_text, chunk_size, overlap)
    print(f"组合分段 (最大大小={chunk_size}, 重叠={overlap}):")
    print(f"生成了 {len(combined_chunks)} 个文本块")
    for i, chunk in enumerate(combined_chunks):
        print(f"\n块 {i+1} ({len(chunk)} 字符):")
        print(f"{chunk[:100]}..." if len(chunk) > 100 else chunk)
    
    print("\n" + "="*50 + "\n")
    
    # 测试智能混合分段
    smart_chunks = segment_text_smart(sample_text, chunk_size, overlap)
    print(f"智能混合分段 (最大大小={chunk_size}, 重叠={overlap}):")
    print(f"生成了 {len(smart_chunks)} 个文本块")
    for i, chunk in enumerate(smart_chunks):
        print(f"\n块 {i+1} ({len(chunk)} 字符):")
        print(f"{chunk[:100]}..." if len(chunk) > 100 else chunk)

def test_with_file(file_path):
    """从文件加载文本并测试不同的分段策略"""
    try:
        # 判断文件类型并读取文本
        if file_path.lower().endswith(('.docx', '.doc')):
            from parse_docx import extract_text_from_word
            text = extract_text_from_word(file_path)
        else:
            with open(file_path, 'r', encoding='utf-8') as file:
                text = file.read()
        
        # 输出文本基本信息
        print(f"从文件 '{file_path}' 加载的文本长度: {len(text)} 字符")
        print(f"文本预览 (前200字符): {text[:200]}...")
        print("\n" + "="*50 + "\n")
        
        # 设置参数
        chunk_size = 500  # 更大的块大小用于实际文档
        overlap = 50
        
        # 分别使用四种策略处理
        strategies = [
            ('固定长度分段', lambda t: segment_text(t, 'fixed_length', chunk_size, overlap)),
            ('段落分段', lambda t: segment_text(t, 'paragraph')),
            ('组合分段', lambda t: segment_text_combined(t, chunk_size, overlap)),
            ('智能混合分段', lambda t: segment_text_smart(t, chunk_size, overlap))
        ]
        
        # 逐一测试每种策略
        for name, func in strategies:
            chunks = func(text)
            print(f"{name} (块大小={chunk_size}, 重叠={overlap}):")
            print(f"生成了 {len(chunks)} 个文本块")
            
            # 打印块的长度分布统计
            lengths = [len(chunk) for chunk in chunks]
            avg_len = sum(lengths) / len(lengths) if lengths else 0
            min_len = min(lengths) if lengths else 0
            max_len = max(lengths) if lengths else 0
            
            print(f"平均块长度: {avg_len:.1f} 字符")
            print(f"最短块长度: {min_len} 字符")
            print(f"最长块长度: {max_len} 字符")
            
            # 打印前两个块的示例
            for i, chunk in enumerate(chunks[:2]):
                print(f"\n块 {i+1} ({len(chunk)} 字符):")
                print(f"{chunk[:150]}..." if len(chunk) > 150 else chunk)
            
            print("\n" + "="*50 + "\n")
    except Exception as e:
        print(f"处理文件时出错: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # 如果提供了文件路径参数，则使用文件进行测试
        file_path = sys.argv[1]
        if os.path.exists(file_path):
            test_with_file(file_path)
        else:
            print(f"错误: 文件 '{file_path}' 不存在")
    else:
        # 否则使用内置的样本文本进行测试
        test_with_sample_text() 