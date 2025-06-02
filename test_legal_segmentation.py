#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
测试法律文档智能分段功能
"""

import os
import sys
import json
from text_segmentation import LegalDocumentSegmenter, LegalSegment

def test_legal_segmentation():
    """测试法律文档分段功能"""
    
    # 模拟的法律文档内容
    sample_legal_text = """
中华人民共和国民法典

第一编 总则

第一章 基本规定

第一条 为了保护民事主体的合法权益，调整民事关系，维护社会和经济秩序，适应中国特色社会主义发展要求，弘扬社会主义核心价值观，根据宪法，制定本法。

第二条 民法调整平等主体的自然人、法人和非法人组织之间的人身关系和财产关系。

第三条 民事主体的人身权利、财产权利以及其他合法权益受法律保护，任何组织或者个人不得侵犯。

第二章 自然人

第一节 民事权利能力和民事行为能力

第十条 自然人的民事权利能力一律平等。

第十一条 十八周岁以上的自然人为成年人。不满十八周岁的自然人为未成年人。

第十二条 不满八周岁的未成年人为无民事行为能力人，由其法定代理人代理实施民事法律行为。

第二节 监护

第二十六条 父母对未成年子女负有抚养、教育和保护的义务。
（一）抚养义务包括提供生活费用、医疗费用等。
（二）教育义务包括接受义务教育、道德教育等。
1. 确保接受九年义务教育。
2. 进行必要的道德品格教育。

第二十七条 父母是未成年子女的监护人。
"""
    
    print("🚀 开始测试法律文档智能分段功能")
    print("=" * 60)
    
    # 创建分段器
    segmenter = LegalDocumentSegmenter()
    
    # 进行分段
    print("📝 正在分析法律文档结构...")
    segments = segmenter.segment_by_legal_structure(
        sample_legal_text, 
        "中华人民共和国民法典",
        max_tokens=500,  # 较小的值便于测试
        min_tokens=50
    )
    
    print(f"✅ 分段完成！共生成 {len(segments)} 个分段")
    print("=" * 60)
    
    # 显示分段结果
    for i, segment in enumerate(segments, 1):
        print(f"\n📋 **分段 {i}**")
        print("-" * 40)
        print(f"🏛️  **法律名称**: {segment.law_name}")
        print(f"📚  **编**: {segment.book or '无'}")
        print(f"📖  **章**: {segment.chapter or '无'}")
        print(f"📑  **节**: {segment.section or '无'}")
        print(f"📃  **条**: {segment.article or '无'}")
        print(f"📝  **款**: {segment.paragraph or '无'}")
        print(f"🔢  **项**: {segment.item or '无'}")
        print(f"⚡  **Token数量**: {segment.token_count}")
        print(f"📄  **内容长度**: {len(segment.content)} 字符")
        
        # 显示内容预览
        content_preview = segment.content.replace('\n', ' ').strip()
        if len(content_preview) > 150:
            content_preview = content_preview[:150] + "..."
        print(f"📝  **内容预览**: {content_preview}")
        
        # 显示完整元数据
        metadata = segment.to_dict()['metadata']
        print(f"🏷️  **元数据**: {metadata}")
        print()
    
    # 统计信息
    print("=" * 60)
    print("📊 **分段统计信息**")
    print("-" * 40)
    
    total_tokens = sum(segment.token_count for segment in segments)
    avg_tokens = total_tokens / len(segments) if segments else 0
    
    books = set(segment.book for segment in segments if segment.book)
    chapters = set(segment.chapter for segment in segments if segment.chapter)
    sections = set(segment.section for segment in segments if segment.section)
    articles = set(segment.article for segment in segments if segment.article)
    
    print(f"📊 总分段数: {len(segments)}")
    print(f"⚡ 总Token数: {total_tokens}")
    print(f"📊 平均Token数: {avg_tokens:.1f}")
    print(f"📚 涉及编数: {len(books)}")
    print(f"📖 涉及章数: {len(chapters)}")
    print(f"📑 涉及节数: {len(sections)}")
    print(f"📃 涉及条数: {len(articles)}")
    
    return segments

def demo_search_capabilities(segments):
    """演示基于结构化元数据的搜索能力"""
    print("\n" + "=" * 60)
    print("🔍 **演示搜索功能**")
    print("-" * 40)
    
    # 模拟搜索场景
    search_queries = [
        ("第一章的所有内容", lambda s: s.chapter and "基本规定" in s.chapter),
        ("关于监护的条文", lambda s: s.section and "监护" in s.section),
        ("第十一条的内容", lambda s: s.article and s.article == "十一"),
        ("民事权利相关条文", lambda s: "民事权利" in s.content)
    ]
    
    for query_desc, search_func in search_queries:
        print(f"\n🔍 搜索: {query_desc}")
        results = [segment for segment in segments if search_func(segment)]
        
        if results:
            print(f"✅ 找到 {len(results)} 个相关分段:")
            for i, result in enumerate(results, 1):
                location = []
                if result.book: location.append(f"编:{result.book}")
                if result.chapter: location.append(f"章:{result.chapter}")
                if result.section: location.append(f"节:{result.section}")
                if result.article: location.append(f"条:{result.article}")
                
                location_str = " > ".join(location) if location else "位置信息不完整"
                content_preview = result.content.replace('\n', ' ').strip()[:100] + "..."
                
                print(f"  {i}. 📍 {location_str}")
                print(f"     💬 {content_preview}")
        else:
            print("❌ 未找到相关内容")

if __name__ == "__main__":
    # 运行测试
    segments = test_legal_segmentation()
    
    # 演示搜索功能
    demo_search_capabilities(segments)
    
    print("\n" + "=" * 60)
    print("🎉 测试完成！")
    print("✨ 你的法律结构分段方案非常棒!")
    print("📈 建议下一步: 集成DeepSeek API进行向量化") 