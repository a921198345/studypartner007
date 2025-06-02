#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
法律文档智能分段模块
按照法律文档的自然结构进行分段，提取结构化元数据
"""

import re
import json
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class LegalSegment:
    """法律文档分段数据结构"""
    content: str  # 分段内容
    law_name: str  # 法律名称
    book: Optional[str] = None  # 编
    chapter: Optional[str] = None  # 章
    section: Optional[str] = None  # 节
    article: Optional[str] = None  # 条
    paragraph: Optional[str] = None  # 款
    item: Optional[str] = None  # 项
    token_count: int = 0  # 估算token数量
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            'content': self.content,
            'metadata': {
                'law_name': self.law_name,
                'book': self.book,
                'chapter': self.chapter,
                'section': self.section,
                'article': self.article,
                'paragraph': self.paragraph,
                'item': self.item,
                'token_count': self.token_count
            }
        }

class LegalDocumentSegmenter:
    """法律文档分段器"""
    
    def __init__(self):
        # 法律结构识别正则表达式
        self.patterns = {
            'law_title': r'^(中华人民共和国.*?法|.*?条例|.*?规定|.*?办法)$',
            'book': r'^第[一二三四五六七八九十]+编\s+(.+)$',
            'chapter': r'^第[一二三四五六七八九十]+章\s+(.+)$',
            'section': r'^第[一二三四五六七八九十]+节\s+(.+)$',
            'article': r'^第([一二三四五六七八九十]+|[0-9]+)条\s+(.+)$',
            'paragraph': r'^\s*（[一二三四五六七八九十]+）\s*(.+)$',
            'item': r'^\s*[0-9]+[.、]\s*(.+)$'
        }
        
        # 中文数字转阿拉伯数字映射
        self.chinese_num_map = {
            '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
            '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
        }
    
    def estimate_tokens(self, text: str) -> int:
        """估算文本的token数量（粗略估算：中文字符数 * 1.5）"""
        return int(len(text.strip()) * 1.5)
    
    def extract_chinese_number(self, text: str) -> Optional[int]:
        """提取中文数字并转换为阿拉伯数字"""
        if text.isdigit():
            return int(text)
        
        # 处理简单的中文数字
        if text in self.chinese_num_map:
            return self.chinese_num_map[text]
        
        return None
    
    def identify_structure_level(self, line: str) -> Dict[str, Any]:
        """识别文本行的结构层级"""
        line = line.strip()
        
        for level, pattern in self.patterns.items():
            match = re.match(pattern, line)
            if match:
                return {
                    'level': level,
                    'match': match,
                    'line': line
                }
        
        return {'level': 'content', 'line': line}
    
    def segment_by_legal_structure(
        self, 
    text: str, 
        law_name: str = "未知法律",
        max_tokens: int = 800,
        min_tokens: int = 100
    ) -> List[LegalSegment]:
    """
        按法律结构进行智能分段
        
        Args:
            text: 法律文档全文
            law_name: 法律名称
            max_tokens: 最大token数
            min_tokens: 最小token数
            
        Returns:
            分段列表
        """
        lines = text.split('\n')
        segments = []
        
        # 当前结构状态
        current_structure = {
            'law_name': law_name,
            'book': None,
            'chapter': None,
            'section': None,
            'article': None,
            'paragraph': None,
            'item': None
        }
        
        # 当前分段内容
        current_content = []
        
        for line in lines:
            if not line.strip():
                continue
                
            structure_info = self.identify_structure_level(line)
            level = structure_info['level']
            
            # 如果遇到新的结构层级
            if level != 'content':
                # 保存之前的内容（如果有的话）
                if current_content:
                    content_text = '\n'.join(current_content)
                    token_count = self.estimate_tokens(content_text)
                    
                    if token_count >= min_tokens:
                        segment = LegalSegment(
                            content=content_text,
                            token_count=token_count,
                            **current_structure
                        )
                        segments.append(segment)
                    
                    current_content = []
                
                # 更新结构状态
                if level == 'book':
                    current_structure.update({
                        'book': structure_info['match'].group(1),
                        'chapter': None,
                        'section': None,
                        'article': None,
                        'paragraph': None,
                        'item': None
                    })
                elif level == 'chapter':
                    current_structure.update({
                        'chapter': structure_info['match'].group(1),
                        'section': None,
                        'article': None,
                        'paragraph': None,
                        'item': None
                    })
                elif level == 'section':
                    current_structure.update({
                        'section': structure_info['match'].group(1),
                        'article': None,
                        'paragraph': None,
                        'item': None
                    })
                elif level == 'article':
                    current_structure.update({
                        'article': structure_info['match'].group(1),
                        'paragraph': None,
                        'item': None
                    })
                elif level == 'paragraph':
                    current_structure['paragraph'] = structure_info['match'].group(1)
                    current_structure['item'] = None
                elif level == 'item':
                    current_structure['item'] = structure_info['match'].group(1)
            
            # 添加到当前内容
            current_content.append(line)
            
            # 检查是否需要强制分段（避免过长）
            if current_content:
                current_tokens = self.estimate_tokens('\n'.join(current_content))
                if current_tokens >= max_tokens and level == 'article':
                    content_text = '\n'.join(current_content)
                    segment = LegalSegment(
                        content=content_text,
                        token_count=current_tokens,
                        **current_structure
                    )
                    segments.append(segment)
                    current_content = []
        
        # 处理最后剩余的内容
        if current_content:
            content_text = '\n'.join(current_content)
            token_count = self.estimate_tokens(content_text)
            
            if token_count >= min_tokens:
                segment = LegalSegment(
                    content=content_text,
                    token_count=token_count,
                    **current_structure
                )
                segments.append(segment)
    
        return segments

    def segment_with_ai_enhancement(
        self, 
        text: str, 
        law_name: str = "未知法律"
    ) -> List[LegalSegment]:
    """
        使用AI增强的分段方法（可选功能）
        这里可以集成DeepSeek API来优化分段质量
        """
        # 先用基础方法分段
        basic_segments = self.segment_by_legal_structure(text, law_name)
        
        # TODO: 这里可以添加AI增强逻辑
        # 例如：
        # 1. 检查分段的语义完整性
        # 2. 优化分段边界
        # 3. 提取更精确的元数据
        
        return basic_segments

def main():
    """测试函数"""
    # 示例法律文本
    sample_text = """
中华人民共和国民法典

第一编 总则

第一章 基本规定

第一条 为了保护民事主体的合法权益，调整民事关系，维护社会和经济秩序，适应中国特色社会主义发展要求，弘扬社会主义核心价值观，根据宪法，制定本法。

第二条 民法调整平等主体的自然人、法人和非法人组织之间的人身关系和财产关系。

第三条 民事主体的人身权利、财产权利以及其他合法权益受法律保护，任何组织或者个人不得侵犯。
    """
    
    segmenter = LegalDocumentSegmenter()
    segments = segmenter.segment_by_legal_structure(sample_text, "中华人民共和国民法典")
    
    # 输出结果
    for i, segment in enumerate(segments, 1):
        print(f"=== 分段 {i} ===")
        print(f"法律: {segment.law_name}")
        print(f"编: {segment.book}")
        print(f"章: {segment.chapter}")
        print(f"条: {segment.article}")
        print(f"Token数: {segment.token_count}")
        print(f"内容: {segment.content[:100]}...")
        print()

if __name__ == "__main__":
    main() 