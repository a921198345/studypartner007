#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
测试增强法律结构识别功能
"""

import os
import sys
import json
import time
from legal_structure_recognition import (
    chinese_to_arabic, 
    extract_law_name, 
    extract_article_number,
    extract_chapter_number,
    extract_section_number,
    extract_part_number,
    recognize_legal_structure,
    segment_with_structure
)

def test_chinese_to_arabic():
    """测试中文数字转阿拉伯数字功能"""
    test_cases = [
        ("一", 1),
        ("十", 10),
        ("十一", 11),
        ("二十", 20),
        ("一百零一", 101),
        ("一千零一", 1001),
        ("一千零一十", 1010),
        ("一万零一百零一", 10101),
        ("二百五十六", 256),
        ("123", 123)  # 测试直接输入阿拉伯数字
    ]
    
    print("===== 测试中文数字转阿拉伯数字 =====")
    for chinese, expected in test_cases:
        result = chinese_to_arabic(chinese)
        print(f"输入: {chinese:<10} 期望: {expected:<6} 结果: {result:<6} {'✓' if result == expected else '✗'}")

def test_structure_extraction():
    """测试结构元素提取功能"""
    # 测试法律名称提取
    law_name_tests = [
        "中华人民共和国民法典",
        "中华人民共和国刑法",
        "中华人民共和国民事诉讼法",
        "最高人民法院关于适用《中华人民共和国民事诉讼法》的解释",
        "物业管理条例",
        "广东省实施《中华人民共和国治安管理处罚法》办法"
    ]
    
    print("\n===== 测试法律名称提取 =====")
    for text in law_name_tests:
        result = extract_law_name(text)
        print(f"输入: {text}")
        print(f"提取结果: {result}")
        print("-" * 40)
    
    # 测试条款编号提取
    article_tests = [
        "第一条 公民有权...",
        "第十三条 自然人从出生时起到死亡时止，具有民事权利能力...",
        "第一百零一条 当事人对自己提出的主张，有责任提供证据。",
        "第1234条 数字编号条款"
    ]
    
    print("\n===== 测试条款编号提取 =====")
    for text in article_tests:
        original, number = extract_article_number(text)
        print(f"输入: {text}")
        print(f"提取结果: 原文: {original}, 编号: {number}")
        print("-" * 40)
    
    # 测试章节编号提取
    chapter_tests = [
        "第一章 总则",
        "第十五章 附则",
        "第二章",
        "第100章 数字编号章节"
    ]
    
    print("\n===== 测试章节编号提取 =====")
    for text in chapter_tests:
        original, number, name = extract_chapter_number(text)
        print(f"输入: {text}")
        print(f"提取结果: 原文: {original}, 编号: {number}, 名称: {name}")
        print("-" * 40)
    
    # 测试节编号提取
    section_tests = [
        "第一节 一般规定",
        "第三节 民事权利能力和民事行为能力",
        "第二节",
        "第50节 数字编号节"
    ]
    
    print("\n===== 测试节编号提取 =====")
    for text in section_tests:
        original, number, name = extract_section_number(text)
        print(f"输入: {text}")
        print(f"提取结果: 原文: {original}, 编号: {number}, 名称: {name}")
        print("-" * 40)
    
    # 测试编编号提取
    part_tests = [
        "第一编 总则",
        "第二编 物权",
        "第七编",
        "第10编 数字编号编"
    ]
    
    print("\n===== 测试编编号提取 =====")
    for text in part_tests:
        original, number, name = extract_part_number(text)
        print(f"输入: {text}")
        print(f"提取结果: 原文: {original}, 编号: {number}, 名称: {name}")
        print("-" * 40)

def test_structure_recognition():
    """测试综合结构识别功能"""
    test_lines = [
        "中华人民共和国民法典",
        "第一编 总则",
        "第一章 基本规定",
        "第一节 民事权利能力和民事行为能力",
        "第一条 为了保护民事主体的合法权益，调整民事关系，维护社会和经济秩序，适应中国特色社会主义发展要求，弘扬社会主义核心价值观，根据宪法，制定本法。",
        "民事主体的人身权利、财产权利以及其他合法权益受法律保护，任何组织或者个人不得侵犯。",
        "立法应当立足于中国特色社会主义的基本要求和现实国情。"
    ]
    
    print("\n===== 测试综合结构识别 =====")
    for text in test_lines:
        result = recognize_legal_structure(text)
        print(f"输入: {text}")
        print(f"识别结果: {json.dumps(result, ensure_ascii=False, indent=2)}")
        print("-" * 60)

def test_segmentation_performance():
    """测试分段性能"""
    # 生成一个较大的样本文本，模拟完整的法律文本
    sample_parts = 3
    sample_chapters_per_part = 5
    sample_sections_per_chapter = 3
    sample_articles_per_section = 10
    
    lines = ["中华人民共和国测试法"]
    
    for p in range(1, sample_parts + 1):
        part_name = f"第{p}编 测试编{p}"
        lines.append(part_name)
        
        for c in range(1, sample_chapters_per_part + 1):
            chapter_name = f"第{c}章 测试章{c}"
            lines.append(chapter_name)
            
            for s in range(1, sample_sections_per_chapter + 1):
                section_name = f"第{s}节 测试节{s}"
                lines.append(section_name)
                
                for a in range(1, sample_articles_per_section + 1):
                    article_num = (p-1) * 100 + (c-1) * 20 + (s-1) * 10 + a
                    article_content = f"第{article_num}条 这是测试条款{article_num}的内容，用于测试法律结构识别性能。"
                    lines.append(article_content)
                    lines.append(f"这是第{article_num}条的附加内容，不包含结构标记，用于测试非结构行的处理。")
    
    sample_text = "\n".join(lines)
    
    print(f"\n===== 测试分段性能 =====")
    print(f"样本文本大小: {len(sample_text)} 字节, {sample_text.count('\\n')} 行")
    
    # 记录开始时间
    start_time = time.time()
    
    # 执行分段
    segments = segment_with_structure(sample_text)
    
    # 计算耗时
    elapsed_time = time.time() - start_time
    
    print(f"分段耗时: {elapsed_time:.4f} 秒")
    print(f"分段数量: {len(segments)}")
    
    # 统计各类型分段数量
    structure_types = {}
    for segment in segments:
        structure_type = segment["metadata"]["structure_type"]
        structure_types[structure_type] = structure_types.get(structure_type, 0) + 1
    
    print("结构类型统计:")
    for structure_type, count in structure_types.items():
        print(f"  - {structure_type}: {count}")
    
    # 显示前5个分段示例
    print("\n前5个分段示例:")
    for i, segment in enumerate(segments[:5]):
        print(f"分段 #{i+1}:")
        print(f"内容: {segment['content']}")
        print(f"元数据: {json.dumps(segment['metadata'], ensure_ascii=False, indent=2)}")
        print("-" * 60)

def test_with_file(file_path):
    """从文件加载法律文本并测试分段功能"""
    try:
        # 判断文件类型并读取文本
        if file_path.lower().endswith(('.docx', '.doc')):
            try:
                from parse_docx import extract_text_from_word
                text = extract_text_from_word(file_path)
                print(f"已使用 extract_text_from_word 函数读取 Word 文档")
            except ImportError:
                print("未找到 parse_docx 模块，无法读取 Word 文档")
                return
        else:
            with open(file_path, 'r', encoding='utf-8') as file:
                text = file.read()
                print(f"已读取文本文件")
        
        # 输出文本基本信息
        print(f"从文件 '{file_path}' 加载的文本长度: {len(text)} 字符")
        print(f"文本预览 (前200字符): {text[:200]}...")
        print("\n" + "="*50 + "\n")
        
        # 记录开始时间
        start_time = time.time()
        
        # 进行法律结构分段
        segments = segment_with_structure(text)
        
        # 计算耗时
        elapsed_time = time.time() - start_time
        
        print(f"分段耗时: {elapsed_time:.4f} 秒")
        print(f"分段总数: {len(segments)}")
        
        # 统计各类型分段数量
        structure_types = {}
        for segment in segments:
            structure_type = segment["metadata"]["structure_type"]
            structure_types[structure_type] = structure_types.get(structure_type, 0) + 1
        
        print("结构类型统计:")
        for structure_type, count in structure_types.items():
            print(f"  - {structure_type}: {count}")
        
        # 显示前5个分段示例
        print("\n前5个分段示例:")
        for i, segment in enumerate(segments[:5]):
            print(f"分段 #{i+1}:")
            print(f"内容: {segment['content']}")
            print(f"元数据: {json.dumps(segment['metadata'], ensure_ascii=False, indent=2)}")
            print("-" * 60)
        
    except Exception as e:
        print(f"处理文件时出错: {str(e)}")

if __name__ == "__main__":
    # 运行所有测试
    if len(sys.argv) > 1:
        # 如果提供了文件路径，使用文件测试
        file_path = sys.argv[1]
        test_with_file(file_path)
    else:
        # 否则运行所有内部测试
        test_chinese_to_arabic()
        test_structure_extraction()
        test_structure_recognition()
        test_segmentation_performance() 