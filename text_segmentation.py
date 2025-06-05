#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
法律文档智能分段模块
"""

import re
from typing import List, Dict, Any, Optional, Tuple

def segment_text(full_text, strategy='fixed_length', chunk_size=500, overlap=50):
    """
    将文本分成更小的块
    
    Args:
        full_text: 要分段的完整文本
        strategy: 分段策略，'fixed_length'（固定长度）或'paragraph'（段落）
        chunk_size: 每个块的最大大小
        overlap: 块之间的重叠大小
        
    Returns:
        文本块列表
    """
    if strategy == 'paragraph':
        # 按段落分段
        paragraphs = [p for p in full_text.split('\n') if p.strip()]
        chunks = []
        current_chunk = []
        current_length = 0
    
        for para in paragraphs:
            # 如果单个段落超过chunk_size，单独作为一个chunk
            if len(para) > chunk_size:
                # 如果当前chunk不为空，先保存
                if current_chunk:
                    chunks.append('\n'.join(current_chunk))
                    current_chunk = []
                    current_length = 0
                
                # 长段落单独作为一个chunk
                chunks.append(para)
                continue
            
            # 如果加上新段落后超过chunk_size，先保存当前chunk
            if current_length + len(para) > chunk_size:
                chunks.append('\n'.join(current_chunk))
                current_chunk = [para]
                current_length = len(para)
            else:
                current_chunk.append(para)
                current_length += len(para)
        
        # 保存最后一个chunk
        if current_chunk:
            chunks.append('\n'.join(current_chunk))
        
        return chunks
    
    else:  # 默认fixed_length策略
        # 按固定长度分段，保持文本重叠
        chunks = []
        start = 0
        text_length = len(full_text)
        
        while start < text_length:
            end = min(start + chunk_size, text_length)
            
            # 处理中文分词问题，避免在句子中间切断
            if end < text_length:
                # 尝试在句号、问号、感叹号、分号处断开
                for i in range(min(100, chunk_size // 4)):
                    if end - i >= 0 and full_text[end - i] in ['。', '！', '？', '；', '.', '!', '?', ';']:
                        end = end - i
                        break
            
            chunks.append(full_text[start:end])
            start = end - overlap
        
        return chunks

def segment_text_combined(full_text, max_chunk_size=1000, overlap=100):
    """
    组合分段策略，先按段落分，再按长度控制
    
    Args:
        full_text: 要分段的完整文本
        max_chunk_size: 最大分段大小
        overlap: 重叠长度
        
    Returns:
        分段列表
    """
    # 先按段落分
    paragraphs = [p for p in full_text.split('\n') if p.strip()]
    
    chunks = []
    current_chunk = []
    current_length = 0
    
    for para in paragraphs:
        # 如果当前段落加上现有chunk会超过max_chunk_size
        if current_length + len(para) > max_chunk_size:
            # 保存当前chunk
            if current_chunk:
                chunks.append('\n'.join(current_chunk))
            
            # 如果单个段落就超长，需要进一步分割
            if len(para) > max_chunk_size:
                # 按固定长度再分段
                para_chunks = segment_text(para, 'fixed_length', max_chunk_size, overlap)
                chunks.extend(para_chunks)
                current_chunk = []
                current_length = 0
            else:
                # 否则开始新的chunk
                current_chunk = [para]
                current_length = len(para)
        else:
            # 添加到当前chunk
            current_chunk.append(para)
            current_length += len(para)
    
    # 保存最后一个chunk
    if current_chunk:
        chunks.append('\n'.join(current_chunk))
    
    return chunks

def segment_text_smart(full_text, max_chunk_size=1000, overlap=100):
    """
    智能混合分段策略，考虑语义完整性
    
    Args:
        full_text: 要分段的完整文本
        max_chunk_size: 最大分段大小
        overlap: 重叠长度
        
    Returns:
        分段列表
    """
    # 先尝试识别文档结构
    lines = full_text.split('\n')
    
    # 简单结构识别
    structure_patterns = {
        'header': r'^#+ ',  # Markdown风格标题
        'section': r'^第[一二三四五六七八九十百千]+[编章节条]',  # 法律章节
        'number': r'^[0-9]+\.\s',  # 编号列表
        'bullet': r'^\*\s',  # 项目符号
    }
    
    chunks = []
    current_chunk = []
    current_length = 0
    
    for line in lines:
        if not line.strip():
            # 空行直接添加到当前chunk
            if current_chunk:
                current_chunk.append('')
            continue
        
        # 检查是否是结构行
        is_structure_line = False
        for pattern in structure_patterns.values():
            if re.match(pattern, line):
                is_structure_line = True
                break
        
        # 如果是结构行或当前chunk加上新行会超过max_chunk_size
        if (is_structure_line and current_chunk) or current_length + len(line) > max_chunk_size:
            # 保存当前chunk
            if current_chunk:
                chunks.append('\n'.join(current_chunk))
            
            # 开始新的chunk
            current_chunk = [line]
            current_length = len(line)
        else:
            # 添加到当前chunk
            current_chunk.append(line)
            current_length += len(line)
                
    # 保存最后一个chunk
    if current_chunk:
        chunks.append('\n'.join(current_chunk))
    
    return chunks

def segment_text_legal_structure(full_text, chunk_size=800):
    """
    使用法律结构智能分段器处理文本
    
    Args:
        full_text: 要分段的文本内容
        chunk_size: 最大分段大小
        
    Returns:
        文本段落列表
    """
    # 识别法律文档结构
    segments = []
    
    # 法律特定结构的正则表达式
    law_structure_patterns = {
        'article': r'第[一二三四五六七八九十百千]+条',
        'chapter': r'第[一二三四五六七八九十百千]+章',
        'section': r'第[一二三四五六七八九十百千]+节',
        'clause': r'[（\(][一二三四五六七八九十]+[）\)]',
        'number': r'^\d+[\.\、]'
    }
    
    # 按行分割并处理
    lines = full_text.split('\n')
    current_segment = []
    current_length = 0
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # 检查是否是法律结构行
        is_structure_line = False
        for pattern in law_structure_patterns.values():
            if re.search(pattern, line):
                is_structure_line = True
                break
                
        # 如果是结构行且当前段已有内容，先保存当前段
        if is_structure_line and current_segment and current_length > 0:
            segments.append('\n'.join(current_segment))
            current_segment = []
            current_length = 0
            
        # 如果当前段加上这行会超过最大大小，先保存当前段
        if current_length + len(line) > chunk_size and current_segment:
            segments.append('\n'.join(current_segment))
            current_segment = []
            current_length = 0
            
        # 添加当前行
        current_segment.append(line)
        current_length += len(line)
        
    # 保存最后一个段
    if current_segment:
        segments.append('\n'.join(current_segment))
        
    # 如果没有分段成功，回退到基本的智能分段
    if not segments:
        return segment_text_smart(full_text, max_chunk_size=chunk_size, overlap=100)
        
    return segments

# 定义LegalSegment类和LegalDocumentSegmenter类，用于兼容性
class LegalSegment:
    def __init__(self, text, level=0, title="", parent=None):
        self.text = text
        self.level = level
        self.title = title
        self.parent = parent
        self.children = []
        
    def add_child(self, child):
        self.children.append(child)
        child.parent = self
        
    def to_dict(self):
        return {
            "text": self.text,
            "level": self.level,
            "title": self.title,
            "children": [child.to_dict() for child in self.children]
        }
        
class LegalDocumentSegmenter:
    def __init__(self):
        pass
        
    def segment(self, text):
        segments = segment_text_legal_structure(text)
        root = LegalSegment("", 0, "根节点")
        
        for segment in segments:
            legal_segment = LegalSegment(segment, 1)
            root.add_child(legal_segment)
            
        return root
