#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
详细分析23年法考题的分类问题
"""

import re
import random
from docx import Document

# 科目关键词映射（与分类脚本相同）
SUBJECT_KEYWORDS = {
    '民法': [
        '民法', '合同', '物权', '债权', '侵权', '婚姻', '继承', '人格权', '担保', '抵押', '质押', 
        '买卖', '租赁', '借款', '赠与', '保证', '定金', '违约', '损害赔偿', '所有权', '用益物权',
        '占有', '善意取得', '不当得利', '无因管理', '婚姻家庭', '离婚', '抚养', '赡养', '遗嘱',
        '法定继承', '遗赠', '著作权', '专利权', '商标权', '知识产权', '隐私权', '名誉权'
    ],
    '刑法': [
        '刑法', '犯罪', '刑罚', '故意', '过失', '正当防卫', '紧急避险', '犯罪构成', '主观要件',
        '客观要件', '共同犯罪', '主犯', '从犯', '教唆犯', '累犯', '自首', '立功', '缓刑', '假释',
        '盗窃', '抢劫', '诈骗', '贪污', '受贿', '行贿', '挪用', '职务侵占', '故意杀人', '故意伤害',
        '强奸', '绑架', '非法拘禁', '敲诈勒索', '寻衅滋事', '聚众斗殴', '毒品', '走私', '伪造',
        '危险驾驶', '交通肇事', '渎职', '玩忽职守', '徇私枉法', '量刑', '死刑', '无期徒刑', '有期徒刑',
        '拘役', '管制', '罚金', '没收财产', '剥夺政治权利'
    ],
    '民事诉讼法': [
        '民事诉讼', '民诉', '起诉', '受理', '管辖', '级别管辖', '地域管辖', '移送管辖', '管辖权异议',
        '原告', '被告', '第三人', '诉讼代理人', '举证责任', '证据', '证明标准', '调解', '撤诉',
        '缺席判决', '简易程序', '普通程序', '二审', '上诉', '再审', '审判监督', '执行', '强制执行',
        '财产保全', '先予执行', '诉讼时效', '期间', '送达', '开庭', '法庭辩论', '判决', '裁定',
        '调解书', '支付令', '公示催告', '诉讼费'
    ],
    '刑事诉讼法': [
        '刑事诉讼', '刑诉', '立案', '侦查', '起诉', '审判', '执行', '管辖', '回避', '辩护', '辩护人',
        '犯罪嫌疑人', '被告人', '被害人', '证人', '鉴定', '勘验', '检查', '搜查', '扣押', '逮捕',
        '拘留', '取保候审', '监视居住', '拘传', '强制措施', '侦查终结', '审查起诉', '公诉', '自诉',
        '简易程序', '普通程序', '二审程序', '死刑复核', '审判监督程序', '执行程序', '刑事和解',
        '认罪认罚', '速裁程序', '缺席审判'
    ],
    '行政法': [
        '行政法', '行政行为', '行政许可', '行政处罚', '行政强制', '行政复议', '行政诉讼', '行政主体',
        '行政相对人', '具体行政行为', '抽象行政行为', '行政立法', '行政决定', '行政命令', '行政指导',
        '行政合同', '行政给付', '行政征收', '行政征用', '行政确认', '行政监督', '行政责任', '国家赔偿',
        '行政机关', '公务员', '行政程序', '听证', '告知', '说明理由', '政府信息公开', '信访'
    ],
    '商经知': [
        '商法', '经济法', '公司法', '公司', '股东', '董事', '监事', '股权', '股份', '有限责任公司',
        '股份有限公司', '合伙', '合伙企业', '个人独资', '破产', '清算', '重整', '和解', '证券',
        '股票', '债券', '基金', '期货', '保险', '保险合同', '投保人', '被保险人', '受益人', '保险金',
        '票据', '汇票', '本票', '支票', '背书', '承兑', '保证', '追索权', '信托', '信托财产',
        '反垄断', '反不正当竞争', '消费者权益', '产品质量', '食品安全', '环境保护', '劳动法',
        '劳动合同', '社会保险', '工伤', '税法', '增值税', '所得税', '房地产', '建设工程', '招投标'
    ],
    '三国法': [
        '国际法', '国际公法', '国际私法', '国际经济法', '国家主权', '国家领土', '领海', '领空',
        '外交关系', '领事关系', '条约', '国际习惯', '国际组织', '联合国', '国际法院', '国际责任',
        '国际争端', '战争法', '国际人权法', '引渡', '庇护', '国籍', '外国人', '冲突规范', '准据法',
        '法律冲突', '反致', '公共秩序保留', '法律规避', '识别', '涉外合同', '涉外侵权', '涉外婚姻',
        '涉外继承', '国际商事仲裁', '司法协助', '外国判决承认执行', 'WTO', '国际贸易', '国际投资',
        '国际金融', '国际税收', '海商法', '海事', '海损', '共同海损', '海上保险', '提单', '租船合同',
        'CIP', 'CIF', 'FOB', '国际货物销售合同公约'
    ],
    '理论法': [
        '法理学', '法理', '法的概念', '法的本质', '法的特征', '法的作用', '法的价值', '正义', '自由',
        '秩序', '法的要素', '法律规则', '法律原则', '法律概念', '法的渊源', '法律体系', '法的效力',
        '法律关系', '权利', '义务', '法律事实', '法律行为', '法的运行', '立法', '执法', '司法',
        '守法', '法律监督', '法律解释', '法律推理', '法律论证', '法治', '依法治国', '宪法', '宪法学',
        '国家制度', '根本制度', '基本制度', '选举制度', '国家机构', '全国人大', '国务院', '监察委',
        '人民法院', '人民检察院', '基本权利', '公民权利', '政治权利', '人身自由', '财产权', '社会权利',
        '法制史', '中国法制史', '外国法制史', '司法制度', '法律职业道德', '职业道德', '职业操守'
    ]
}

def extract_questions_from_doc(doc_path):
    """从文档中提取题目"""
    doc = Document(doc_path)
    questions = []
    current_question = None
    current_content = []
    
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        
        # 跳过标题
        if text in ['2023年法考客观题（真题+答案解析）', '2023 年客观回忆版真题', '试卷一', '一、单项选择题']:
            continue
        
        # 检查是否是分隔线
        if text.startswith('------'):
            # 保存当前题目
            if current_question and current_content:
                questions.append({
                    'number': current_question,
                    'content': '\n'.join(current_content),
                    'question_text': '',
                    'answer_text': ''
                })
            current_question = None
            current_content = []
            continue
        
        # 尝试匹配题号
        if text and text[0].isdigit():
            dot_pos = -1
            for i, char in enumerate(text):
                if char in '.．。':
                    dot_pos = i
                    break
            
            if dot_pos > 0 and dot_pos < 5:
                try:
                    q_num = int(text[:dot_pos])
                    # 检查是否是答案行
                    if '正确答案' in text:
                        if current_question:
                            current_content.append(text)
                    else:
                        # 这是新题目
                        if current_question and current_content:
                            questions.append({
                                'number': current_question,
                                'content': '\n'.join(current_content),
                                'question_text': '',
                                'answer_text': ''
                            })
                        current_question = q_num
                        current_content = [text]
                except ValueError:
                    if current_question:
                        current_content.append(text)
            else:
                if current_question:
                    current_content.append(text)
        else:
            if current_question:
                current_content.append(text)
    
    # 保存最后一题
    if current_question and current_content:
        questions.append({
            'number': current_question,
            'content': '\n'.join(current_content),
            'question_text': '',
            'answer_text': ''
        })
    
    # 分离题目和答案
    for q in questions:
        lines = q['content'].split('\n')
        question_lines = []
        answer_lines = []
        in_answer = False
        
        for line in lines:
            if '正确答案' in line or '【答案解析】' in line:
                in_answer = True
            
            if in_answer:
                answer_lines.append(line)
            else:
                question_lines.append(line)
        
        q['question_text'] = '\n'.join(question_lines)
        q['answer_text'] = '\n'.join(answer_lines)
    
    return questions

def classify_question(question_text, answer_text=''):
    """根据题目内容判断所属科目"""
    full_text = (question_text + ' ' + answer_text).lower()
    
    # 统计每个科目的关键词匹配数
    subject_scores = {}
    match_details = {}
    
    for subject, keywords in SUBJECT_KEYWORDS.items():
        score = 0
        matches = []
        
        for keyword in keywords:
            count = full_text.count(keyword.lower())
            if count > 0:
                # 根据关键词长度给不同权重
                if len(keyword) >= 4:
                    weight = 3
                elif len(keyword) >= 3:
                    weight = 2
                else:
                    weight = 1
                
                score += count * weight
                matches.append({'keyword': keyword, 'count': count, 'weight': weight})
        
        if score > 0:
            subject_scores[subject] = score
            match_details[subject] = matches
    
    # 如果没有匹配到任何关键词，返回None
    if not subject_scores:
        return None, {}, {}
    
    # 返回得分最高的科目
    predicted_subject = max(subject_scores.items(), key=lambda x: x[1])[0]
    return predicted_subject, subject_scores, match_details

def analyze_law_references(text):
    """分析法条引用"""
    # 查找法条引用模式
    law_patterns = [
        r'《([^》]+法[^》]*)》',  # 《xxx法》
        r'《([^》]+条例[^》]*)》',  # 《xxx条例》
        r'《([^》]+规定[^》]*)》',  # 《xxx规定》
        r'第\s*(\d+)\s*条',  # 第x条
        r'第\s*(\d+)\s*款',  # 第x款
        r'第\s*(\d+)\s*项',  # 第x项
    ]
    
    references = []
    for pattern in law_patterns:
        matches = re.findall(pattern, text)
        references.extend(matches)
    
    return references

def main():
    # 分析23年法考题文档
    doc_path = '/Users/acheng/Downloads/law-exam-assistant/23年法考题.docx'
    
    print("正在提取题目...")
    questions = extract_questions_from_doc(doc_path)
    print(f"共提取到 {len(questions)} 道题目")
    
    # 随机抽取15道题目进行详细分析
    sample_questions = random.sample(questions, min(15, len(questions)))
    
    print("\n=== 随机抽取题目进行详细分析 ===")
    
    analysis_results = []
    
    for i, q in enumerate(sample_questions):
        print(f"\n--- 第{i+1}题 (题号: {q['number']}) ---")
        
        # 分类分析
        predicted_subject, scores, match_details = classify_question(q['question_text'], q['answer_text'])
        
        print(f"预测科目: {predicted_subject}")
        print(f"得分情况: {scores}")
        
        # 显示题目内容
        print(f"\n题目内容: {q['question_text'][:200]}...")
        
        # 分析法条引用
        law_refs = analyze_law_references(q['question_text'] + ' ' + q['answer_text'])
        if law_refs:
            print(f"法条引用: {law_refs[:5]}...")  # 只显示前5个
        
        # 检查关键词匹配详情
        if match_details:
            print("\n关键词匹配详情:")
            for subject, matches in match_details.items():
                if matches:
                    top_matches = sorted(matches, key=lambda x: x['count'] * x['weight'], reverse=True)[:3]
                    print(f"  {subject}: {[m['keyword'] for m in top_matches]}")
        
        # 如果有答案解析，显示部分内容
        if q['answer_text']:
            print(f"\n答案解析: {q['answer_text'][:150]}...")
        
        analysis_results.append({
            'number': q['number'],
            'predicted_subject': predicted_subject,
            'scores': scores,
            'law_refs': law_refs,
            'has_analysis': bool(q['answer_text'])
        })
    
    # 统计分析结果
    print("\n\n=== 分析结果统计 ===")
    
    subject_counts = {}
    for result in analysis_results:
        subject = result['predicted_subject'] or '未分类'
        subject_counts[subject] = subject_counts.get(subject, 0) + 1
    
    print("科目分布:")
    for subject, count in sorted(subject_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {subject}: {count} 道")
    
    # 寻找可能的刑法题目
    print("\n=== 寻找可能的刑法题目 ===")
    criminal_keywords = ['犯罪', '刑法', '故意', '过失', '盗窃', '诈骗', '抢劫', '故意杀人', '不作为']
    
    possible_criminal = []
    for q in questions:
        full_text = (q['question_text'] + ' ' + q['answer_text']).lower()
        for keyword in criminal_keywords:
            if keyword in full_text:
                possible_criminal.append(q)
                break
    
    print(f"发现 {len(possible_criminal)} 道可能的刑法题目")
    
    # 分析前5道可能的刑法题目
    for i, q in enumerate(possible_criminal[:5]):
        predicted_subject, scores, _ = classify_question(q['question_text'], q['answer_text'])
        print(f"\n题目 {q['number']}: 预测为 {predicted_subject}")
        print(f"  题目: {q['question_text'][:100]}...")
        print(f"  得分: {scores}")
    
    # 分析民法和商经知分类过多的原因
    print("\n=== 分析分类问题 ===")
    
    # 检查关键词重叠
    print("\n关键词重叠分析:")
    民法_keywords = set(SUBJECT_KEYWORDS['民法'])
    商经知_keywords = set(SUBJECT_KEYWORDS['商经知'])
    三国法_keywords = set(SUBJECT_KEYWORDS['三国法'])
    
    overlaps = 民法_keywords & 商经知_keywords
    if overlaps:
        print(f"民法与商经知重叠关键词: {overlaps}")
    
    overlaps = 民法_keywords & 三国法_keywords
    if overlaps:
        print(f"民法与三国法重叠关键词: {overlaps}")
    
    # 建议改进
    print("\n=== 改进建议 ===")
    print("1. 优化关键词权重：增加专业性强的关键词权重")
    print("2. 增加法条引用分析：根据引用的具体法条判断科目")
    print("3. 添加排除词：某些通用词汇在特定语境下应被排除")
    print("4. 考虑答案解析：答案解析中的法条引用比题目正文更准确")
    print("5. 增加上下文分析：考虑题目的整体语境和案例类型")

if __name__ == "__main__":
    main()