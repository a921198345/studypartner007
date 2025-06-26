#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
深入分析2024年法考前30题，查找可能的刑法题目
"""

import re
from docx import Document

def extract_questions(doc_path, start=1, end=30):
    """提取指定范围的题目内容"""
    doc = Document(doc_path)
    questions = {}
    current_question = None
    current_content = []
    question_pattern = re.compile(r'^(\d+)\.')
    
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        
        # 检查是否是新题目的开始
        match = question_pattern.match(text)
        if match:
            # 保存前一个题目
            if current_question is not None and start <= current_question <= end:
                questions[current_question] = '\n'.join(current_content)
            
            # 开始新题目
            current_question = int(match.group(1))
            current_content = [text]
            
            # 如果已经超过了需要的题目范围，停止
            if current_question > end:
                break
        elif current_question is not None:
            # 继续收集当前题目内容
            if text.startswith('---'):
                # 题目结束
                if start <= current_question <= end:
                    questions[current_question] = '\n'.join(current_content)
                current_question = None
                current_content = []
            else:
                current_content.append(text)
    
    # 保存最后一个题目
    if current_question is not None and start <= current_question <= end:
        questions[current_question] = '\n'.join(current_content)
    
    return questions

def analyze_criminal_law_features(content):
    """分析题目中的刑法特征"""
    features = {
        'strong_indicators': [],  # 强指标
        'medium_indicators': [],  # 中等指标
        'weak_indicators': [],    # 弱指标
        'negative_indicators': [] # 负面指标（表明不是刑法题）
    }
    
    # 强指标：具体罪名
    specific_crimes = [
        '故意杀人罪', '过失致人死亡罪', '故意伤害罪', '过失致人重伤罪',
        '强奸罪', '强制猥亵罪', '非法拘禁罪', '绑架罪', '拐卖妇女儿童罪',
        '盗窃罪', '抢劫罪', '抢夺罪', '诈骗罪', '敲诈勒索罪',
        '贪污罪', '受贿罪', '行贿罪', '挪用公款罪', '职务侵占罪',
        '交通肇事罪', '危险驾驶罪', '放火罪', '爆炸罪', '投毒罪'
    ]
    
    for crime in specific_crimes:
        if crime in content:
            features['strong_indicators'].append(f"具体罪名：{crime}")
    
    # 强指标：刑法法条引用
    if re.search(r'《刑法》第\d+条', content) or re.search(r'刑法第\d+条', content):
        features['strong_indicators'].append("刑法法条引用")
    
    # 强指标：刑罚种类
    penalties = ['死刑', '无期徒刑', '有期徒刑', '拘役', '管制', '罚金', '没收财产']
    for penalty in penalties:
        if penalty in content and not ('民事' in content or '行政' in content):
            features['strong_indicators'].append(f"刑罚种类：{penalty}")
    
    # 中等指标：犯罪构成要件
    crime_elements = [
        '犯罪构成', '犯罪主体', '犯罪客体', '犯罪主观', '犯罪客观',
        '主观故意', '主观过失', '直接故意', '间接故意'
    ]
    for element in crime_elements:
        if element in content:
            features['medium_indicators'].append(f"犯罪构成要件：{element}")
    
    # 中等指标：刑法特有制度
    criminal_systems = [
        '正当防卫', '紧急避险', '共同犯罪', '主犯', '从犯',
        '累犯', '自首', '立功', '数罪并罚', '想象竞合'
    ]
    for system in criminal_systems:
        if system in content:
            features['medium_indicators'].append(f"刑法制度：{system}")
    
    # 中等指标：典型刑法案例描述
    if re.search(r'[甲乙丙丁]\s*[为了|因|与|伙同|教唆|指使].*[杀|伤|偷|抢|骗|贪|贿]', content):
        features['medium_indicators'].append("典型刑法案例描述模式")
    
    # 弱指标：可能的刑法关键词（需要结合语境）
    weak_keywords = ['故意', '过失', '犯罪', '定罪', '量刑']
    for keyword in weak_keywords:
        if keyword in content:
            # 检查语境
            context = content[max(0, content.find(keyword)-20):content.find(keyword)+20]
            features['weak_indicators'].append(f"关键词'{keyword}'（语境：...{context}...）")
    
    # 负面指标：明显的其他科目特征
    if '《民法典》' in content or '民法典第' in content:
        features['negative_indicators'].append("包含民法典引用")
    if '《民诉法》' in content or '民事诉讼法' in content:
        features['negative_indicators'].append("包含民诉法引用")
    if '《行政' in content:
        features['negative_indicators'].append("包含行政法引用")
    if '《公司法》' in content or '《劳动' in content:
        features['negative_indicators'].append("包含商经法引用")
    if 'CISG' in content or '国际' in content or '涉外' in content:
        features['negative_indicators'].append("包含国际法特征")
    
    return features

def calculate_criminal_probability(features):
    """根据特征计算是刑法题目的概率"""
    score = 0
    
    # 强指标每个加30分
    score += len(features['strong_indicators']) * 30
    
    # 中等指标每个加15分
    score += len(features['medium_indicators']) * 15
    
    # 弱指标每个加5分
    score += len(features['weak_indicators']) * 5
    
    # 负面指标每个减20分
    score -= len(features['negative_indicators']) * 20
    
    # 确保分数在0-100之间
    score = max(0, min(100, score))
    
    return score

def main():
    # 文件路径
    input_file = '/Users/acheng/Downloads/law-exam-assistant/24年法考题-完整版.docx'
    
    print("深入分析2024年法考前30题")
    print("=" * 80)
    
    # 提取前30题
    questions = extract_questions(input_file, 1, 30)
    
    # 可能的刑法题目
    potential_criminal_questions = []
    
    # 分析每个题目
    for q_num in sorted(questions.keys()):
        content = questions[q_num]
        features = analyze_criminal_law_features(content)
        probability = calculate_criminal_probability(features)
        
        print(f"\n题目 {q_num}:")
        print("-" * 80)
        
        # 打印题目前200个字符
        preview = content[:200].replace('\n', ' ')
        print(f"内容预览：{preview}...")
        
        # 打印特征分析
        print(f"\n特征分析：")
        if features['strong_indicators']:
            print(f"  强指标：")
            for indicator in features['strong_indicators']:
                print(f"    ✓ {indicator}")
        if features['medium_indicators']:
            print(f"  中等指标：")
            for indicator in features['medium_indicators']:
                print(f"    • {indicator}")
        if features['weak_indicators']:
            print(f"  弱指标：")
            for indicator in features['weak_indicators']:
                print(f"    - {indicator}")
        if features['negative_indicators']:
            print(f"  负面指标：")
            for indicator in features['negative_indicators']:
                print(f"    ✗ {indicator}")
        
        # 打印概率评估
        print(f"\n刑法题目概率：{probability}%")
        
        if probability >= 50:
            potential_criminal_questions.append((q_num, probability))
            print(f"判断：可能是刑法题目")
        elif probability >= 20:
            print(f"判断：需要人工审核")
        else:
            print(f"判断：不太可能是刑法题目")
    
    # 总结
    print("\n" + "=" * 80)
    print("分析总结：")
    print(f"在前30题中，发现 {len(potential_criminal_questions)} 道可能的刑法题目：")
    for q_num, prob in potential_criminal_questions:
        print(f"  - 题目 {q_num}（概率：{prob}%）")
    
    if not potential_criminal_questions:
        print("  未发现明显的刑法题目")
        print("\n可能的原因：")
        print("  1. 2024年法考客观题调整了科目比重，减少了刑法题目")
        print("  2. 刑法题目可能集中在31题之后")
        print("  3. 刑法内容可能更多地出现在主观题中")
        print("  4. 部分刑法题目可能以综合性题目的形式出现，不易识别")

if __name__ == "__main__":
    main()