#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
测试增强版解析器
"""

import sys
sys.path.append('.')

from parse_questions_enhanced import parse_question, normalize_text, extract_question_components

# 测试题目20160201的文本（从截图复制）
test_text = """【20160201】
关于不作为犯罪，下列哪一选项是正确的?
A．"法无明文规定不为罪"的原则当然适用于不
作为犯罪，不真正不作为犯罪的作为义务必须源于法律
的明文规定
B．在特殊情况下，不真正不作为犯罪的成立不需要
行为人具有作为可能性
C．不真正不作为犯属于行为犯，危害结果并非不
真正不作为犯的构成要件要素
D．危害公共安全罪、侵犯公民人身权利罪、侵犯
财产罪中均存在不作为犯
【解析】
A 项是错误的。 "法无明文规定不作为罪"的原
则适用于所有犯罪类型，不作为犯罪亦不例外；但是，
不真正不作为犯的义务来源不不限于法律的明文规定，
而有可能来源于生活经验
B 项是错误的。作为可能性的具备是成立不作为
犯罪的必备条件，不具备此条件，不作为犯罪即不成
立
C 项是错误的。不真正不作为犯并非是纯的不作
为即可成立，而是必须具不作为导致一定的法定后果
才成立
D项是正确的。不作为只是一种实施犯罪的方式，
原则上所有犯罪类型均有不作为方式存在的空间
【答案】D"""

print("=" * 60)
print("测试增强版解析器")
print("=" * 60)

# 测试文本标准化
print("\n1. 测试文本标准化")
print("-" * 40)
normalized = normalize_text(test_text)
print("标准化后的选项格式:")
import re
options = re.findall(r'([A-D])[\.、．:：\s]+', normalized)
print(f"找到的选项标记: {options}")

# 测试组件提取
print("\n2. 测试组件提取")
print("-" * 40)
components = extract_question_components(test_text)
if components:
    print(f"题号: {components['question_id']}")
    print(f"题干长度: {len(components['question_stem'])} 字符")
    print(f"选项数量: {len(components['options'])}")
    for opt, content in components['options'].items():
        print(f"  {opt}: {content[:30]}...")
    print(f"答案: {components['answer']}")
else:
    print("组件提取失败!")

# 测试完整解析
print("\n3. 测试完整解析")
print("-" * 40)
result = parse_question(test_text)
if result:
    print("✓ 解析成功!")
    print(f"题号: {result['question_id']}")
    print(f"题型: {result['question_type']}")
    print(f"答案: {result['correct_answer']}")
    print(f"选项数: {len(result['options'])}")
else:
    print("✗ 解析失败!")

# 测试另一个格式
test_text2 = """【20160202】
题干内容
A  ．选项内容1
B  ．选项内容2
C  ．选项内容3
D  ．选项内容4
【解析】解析内容
答案：C"""

print("\n4. 测试格式变体")
print("-" * 40)
result2 = parse_question(test_text2)
if result2:
    print("✓ 解析成功!")
    print(f"题号: {result2['question_id']}")
    print(f"答案: {result2['correct_answer']}")
else:
    print("✗ 解析失败!")

print("\n" + "=" * 60)