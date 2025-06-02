#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
法律结构识别模块
用于识别和提取法律文本中的结构化元素
支持多种格式的法律文档结构
"""

import re
import json
from typing import Dict, List, Tuple, Optional, Any

# 中文数字转阿拉伯数字的映射
CHINESE_NUMS = {
    '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
    '百': 100, '千': 1000, '万': 10000, '亿': 100000000
}

def chinese_to_arabic(chinese_num: str) -> int:
    """
    将中文数字转换为阿拉伯数字
    
    参数:
        chinese_num (str): 中文数字，如"一百二十三"
        
    返回:
        int: 对应的阿拉伯数字
    """
    if not chinese_num:
        return 0
        
    # 如果已经是阿拉伯数字，直接返回
    if chinese_num.isdigit():
        return int(chinese_num)
    
    # 将"十"开头的数字标准化，如"十三"转为"一十三"
    if chinese_num.startswith('十'):
        chinese_num = '一' + chinese_num
    
    result = 0
    temp = 0
    for char in chinese_num:
        if char in CHINESE_NUMS:
            value = CHINESE_NUMS[char]
            if value >= 10:  # 是单位（十、百、千等）
                if temp == 0:
                    temp = 1
                result += temp * value
                temp = 0
            else:  # 是数字
                temp = value
        else:
            # 处理非中文数字字符，如括号等
            continue
    
    # 加上最后可能剩余的数字
    result += temp
    
    return result

def extract_law_name(text: str) -> Optional[str]:
    """
    从文本中提取法律名称
    
    参数:
        text (str): 要分析的文本
        
    返回:
        Optional[str]: 提取的法律名称，如果未找到则返回None
    """
    # 常见法律名称模式
    patterns = [
        r'中华人民共和国(.+?)(?:法|条例|规定|办法|决定|解释)',  # 基本模式
        r'最高人民法院关于(.+?)的(?:解释|规定|办法|决定)',  # 司法解释
        r'(.+?)(?:法|条例|规定|办法|决定|解释)'  # 简单名称
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            full_match = match.group(0)
            return full_match
    
    return None

def extract_article_number(text: str) -> Tuple[Optional[str], Optional[int]]:
    """
    从文本中提取条款编号
    
    参数:
        text (str): 要分析的文本，如"第一百二十三条 公民有权..."
        
    返回:
        Tuple[Optional[str], Optional[int]]: (原始条款文本，条款数字编号)
    """
    # 匹配"第X条"格式
    pattern = r'第([一二三四五六七八九十百千]+|\d+)条'
    match = re.search(pattern, text)
    
    if match:
        original_number = match.group(1)
        
        # 转换为阿拉伯数字
        number = chinese_to_arabic(original_number) if not original_number.isdigit() else int(original_number)
        
        return match.group(0), number
    
    return None, None

def extract_chapter_number(text: str) -> Tuple[Optional[str], Optional[int], Optional[str]]:
    """
    从文本中提取章节编号和名称
    
    参数:
        text (str): 要分析的文本，如"第一章 总则"
        
    返回:
        Tuple[Optional[str], Optional[int], Optional[str]]: (原始章节文本，章节数字编号，章节名称)
    """
    # 匹配"第X章 名称"格式
    pattern = r'第([一二三四五六七八九十百千]+|\d+)章\s*(.+)?'
    match = re.search(pattern, text)
    
    if match:
        original_number = match.group(1)
        
        # 转换为阿拉伯数字
        number = chinese_to_arabic(original_number) if not original_number.isdigit() else int(original_number)
        
        # 提取章节名称
        name = match.group(2).strip() if match.group(2) else None
        
        return match.group(0), number, name
    
    return None, None, None

def extract_section_number(text: str) -> Tuple[Optional[str], Optional[int], Optional[str]]:
    """
    从文本中提取节编号和名称
    
    参数:
        text (str): 要分析的文本，如"第一节 民事权利能力"
        
    返回:
        Tuple[Optional[str], Optional[int], Optional[str]]: (原始节文本，节数字编号，节名称)
    """
    # 匹配"第X节 名称"格式
    pattern = r'第([一二三四五六七八九十百千]+|\d+)节\s*(.+)?'
    match = re.search(pattern, text)
    
    if match:
        original_number = match.group(1)
        
        # 转换为阿拉伯数字
        number = chinese_to_arabic(original_number) if not original_number.isdigit() else int(original_number)
        
        # 提取节名称
        name = match.group(2).strip() if match.group(2) else None
        
        return match.group(0), number, name
    
    return None, None, None

def extract_part_number(text: str) -> Tuple[Optional[str], Optional[int], Optional[str]]:
    """
    从文本中提取编编号和名称
    
    参数:
        text (str): 要分析的文本，如"第一编 总则"
        
    返回:
        Tuple[Optional[str], Optional[int], Optional[str]]: (原始编文本，编数字编号，编名称)
    """
    # 匹配"第X编 名称"格式
    pattern = r'第([一二三四五六七八九十百千]+|\d+)编\s*(.+)?'
    match = re.search(pattern, text)
    
    if match:
        original_number = match.group(1)
        
        # 转换为阿拉伯数字
        number = chinese_to_arabic(original_number) if not original_number.isdigit() else int(original_number)
        
        # 提取编名称
        name = match.group(2).strip() if match.group(2) else None
        
        return match.group(0), number, name
    
    return None, None, None

def recognize_legal_structure(text: str) -> Dict[str, Any]:
    """
    识别文本中的法律结构元素
    
    参数:
        text (str): 要分析的文本
        
    返回:
        Dict[str, Any]: 包含识别结果的字典
    """
    result = {
        "law_name": None,
        "part": None,
        "chapter": None,
        "section": None,
        "article": None,
        "structure_type": "unknown",
        "numbering": None
    }
    
    # 提取法律名称
    law_name = extract_law_name(text)
    if law_name:
        result["law_name"] = law_name
        result["structure_type"] = "law_title"
        return result
    
    # 提取编信息
    part_text, part_number, part_name = extract_part_number(text)
    if part_text:
        result["part"] = {
            "original_text": part_text,
            "number": part_number,
            "name": part_name
        }
        result["structure_type"] = "part"
        result["numbering"] = part_number
        return result
    
    # 提取章信息
    chapter_text, chapter_number, chapter_name = extract_chapter_number(text)
    if chapter_text:
        result["chapter"] = {
            "original_text": chapter_text,
            "number": chapter_number,
            "name": chapter_name
        }
        result["structure_type"] = "chapter"
        result["numbering"] = chapter_number
        return result
    
    # 提取节信息
    section_text, section_number, section_name = extract_section_number(text)
    if section_text:
        result["section"] = {
            "original_text": section_text,
            "number": section_number,
            "name": section_name
        }
        result["structure_type"] = "section"
        result["numbering"] = section_number
        return result
    
    # 提取条款信息
    article_text, article_number = extract_article_number(text)
    if article_text:
        result["article"] = {
            "original_text": article_text,
            "number": article_number
        }
        result["structure_type"] = "article"
        result["numbering"] = article_number
        return result
    
    # 如果没有识别到任何结构，则标记为普通文本
    result["structure_type"] = "plain_text"
    
    return result

def segment_with_structure(text: str) -> List[Dict[str, Any]]:
    """
    将文本进行法律结构分段，并提供结构化的元数据
    
    参数:
        text (str): 要分析的文本
        
    返回:
        List[Dict[str, Any]]: 分段结果列表，每个元素包含文本内容和结构元数据
    """
    # 分割文本为行
    lines = text.split('\n')
    
    segments = []
    
    # 当前上下文信息
    current_law = None
    current_part = None
    current_chapter = None
    current_section = None
    
    # 当前条款内容收集
    current_article_text = None
    current_article_content = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # 识别当前行的结构
        structure_info = recognize_legal_structure(line)
        
        # 处理法律名称
        if structure_info["structure_type"] == "law_title":
            # 如果有未处理的条款内容，先保存
            if current_article_text and current_article_content:
                segments.append({
                    "content": '\n'.join(current_article_content),
                    "metadata": {
                        "law_name": current_law,
                        "part": current_part,
                        "chapter": current_chapter,
                        "section": current_section,
                        "article": current_article_text,
                        "structure_type": "article"
                    }
                })
                current_article_content = []
                current_article_text = None
            
            current_law = structure_info["law_name"]
            segments.append({
                "content": line,
                "metadata": {
                    "law_name": current_law,
                    "part": None,
                    "chapter": None,
                    "section": None,
                    "article": None,
                    "structure_type": "law_title"
                }
            })
            continue
        
        # 处理编
        elif structure_info["structure_type"] == "part":
            # 如果有未处理的条款内容，先保存
            if current_article_text and current_article_content:
                segments.append({
                    "content": '\n'.join(current_article_content),
                    "metadata": {
                        "law_name": current_law,
                        "part": current_part,
                        "chapter": current_chapter,
                        "section": current_section,
                        "article": current_article_text,
                        "structure_type": "article"
                    }
                })
                current_article_content = []
                current_article_text = None
            
            current_part = structure_info["part"]
            current_chapter = None
            current_section = None
            
            segments.append({
                "content": line,
                "metadata": {
                    "law_name": current_law,
                    "part": current_part,
                    "chapter": None,
                    "section": None,
                    "article": None,
                    "structure_type": "part"
                }
            })
            continue
        
        # 处理章
        elif structure_info["structure_type"] == "chapter":
            # 如果有未处理的条款内容，先保存
            if current_article_text and current_article_content:
                segments.append({
                    "content": '\n'.join(current_article_content),
                    "metadata": {
                        "law_name": current_law,
                        "part": current_part,
                        "chapter": current_chapter,
                        "section": current_section,
                        "article": current_article_text,
                        "structure_type": "article"
                    }
                })
                current_article_content = []
                current_article_text = None
            
            current_chapter = structure_info["chapter"]
            current_section = None
            
            segments.append({
                "content": line,
                "metadata": {
                    "law_name": current_law,
                    "part": current_part,
                    "chapter": current_chapter,
                    "section": None,
                    "article": None,
                    "structure_type": "chapter"
                }
            })
            continue
        
        # 处理节
        elif structure_info["structure_type"] == "section":
            # 如果有未处理的条款内容，先保存
            if current_article_text and current_article_content:
                segments.append({
                    "content": '\n'.join(current_article_content),
                    "metadata": {
                        "law_name": current_law,
                        "part": current_part,
                        "chapter": current_chapter,
                        "section": current_section,
                        "article": current_article_text,
                        "structure_type": "article"
                    }
                })
                current_article_content = []
                current_article_text = None
            
            current_section = structure_info["section"]
            
            segments.append({
                "content": line,
                "metadata": {
                    "law_name": current_law,
                    "part": current_part,
                    "chapter": current_chapter,
                    "section": current_section,
                    "article": None,
                    "structure_type": "section"
                }
            })
            continue
        
        # 处理条款
        elif structure_info["structure_type"] == "article":
            # 如果有未处理的条款内容，先保存
            if current_article_text and current_article_content:
                segments.append({
                    "content": '\n'.join(current_article_content),
                    "metadata": {
                        "law_name": current_law,
                        "part": current_part,
                        "chapter": current_chapter,
                        "section": current_section,
                        "article": current_article_text,
                        "structure_type": "article"
                    }
                })
                current_article_content = []
            
            current_article_text = structure_info["article"]["original_text"]
            current_article_content = [line]
        else:
            # 如果是条款的继续内容
            if current_article_text:
                current_article_content.append(line)
            else:
                # 如果不是任何结构中的内容，作为普通文本处理
                segments.append({
                    "content": line,
                    "metadata": {
                        "law_name": current_law,
                        "part": current_part,
                        "chapter": current_chapter,
                        "section": current_section,
                        "article": None,
                        "structure_type": "plain_text"
                    }
                })
    
    # 处理最后一个条款
    if current_article_text and current_article_content:
        segments.append({
            "content": '\n'.join(current_article_content),
            "metadata": {
                "law_name": current_law,
                "part": current_part,
                "chapter": current_chapter,
                "section": current_section,
                "article": current_article_text,
                "structure_type": "article"
            }
        })
    
    # 如果没有识别出任何结构（可能是格式不规范的文本）
    if not segments:
        segments.append({
            "content": text,
            "metadata": {
                "law_name": None,
                "part": None,
                "chapter": None,
                "section": None,
                "article": None,
                "structure_type": "plain_text"
            }
        })
    
    # 添加索引和导航信息
    for i, segment in enumerate(segments):
        segment["metadata"]["index"] = i
        
        # 添加导航信息
        if i > 0:
            segment["metadata"]["prev_index"] = i - 1
        else:
            segment["metadata"]["prev_index"] = None
            
        if i < len(segments) - 1:
            segment["metadata"]["next_index"] = i + 1
        else:
            segment["metadata"]["next_index"] = None
    
    return segments

if __name__ == "__main__":
    # 测试代码
    sample_text = """中华人民共和国民法典
第一编 总则
第一章 基本规定
第一条 为了保护民事主体的合法权益，调整民事关系，维护社会和经济秩序，适应中国特色社会主义发展要求，弘扬社会主义核心价值观，根据宪法，制定本法。
第二条 民法调整平等主体的自然人、法人和非法人组织之间的人身关系和财产关系。
第三条 民事主体的人身权利、财产权利以及其他合法权益受法律保护，任何组织或者个人不得侵犯。

第二章 自然人
第一节 民事权利能力和民事行为能力
第十三条 自然人从出生时起到死亡时止，具有民事权利能力，依法享有民事权利，承担民事义务。
第十四条 自然人的民事权利能力一律平等。

第二编 物权
第一章 一般规定
第二百零五条 本编调整因物的归属和利用产生的民事关系。
第二百零六条 国家坚持和完善公有制为主体、多种所有制经济共同发展，按劳分配为主体、多种分配方式并存，社会主义市场经济体制等社会主义基本经济制度。
"""
    
    # 测试法律结构分析
    result = segment_with_structure(sample_text)
    
    # 输出结果
    print(f"分段总数: {len(result)}")
    for i, segment in enumerate(result):
        print(f"\n分段 #{i+1}:")
        print(f"内容: {segment['content']}")
        print(f"元数据: {json.dumps(segment['metadata'], ensure_ascii=False, indent=2)}")
        print("-" * 60) 