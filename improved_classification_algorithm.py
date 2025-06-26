#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
改进的法考题分类算法
基于分析报告的发现，实现更准确的分类逻辑
"""

import re
from typing import Dict, List, Tuple, Optional

class ImprovedLawClassifier:
    def __init__(self):
        # 高专属性关键词（权重5）
        self.high_specific_keywords = {
            '刑法': [
                '犯罪构成', '主观要件', '客观要件', '正当防卫', '紧急避险',
                '共同犯罪', '主犯', '从犯', '教唆犯', '累犯', '自首', '立功',
                '缓刑', '假释', '死刑', '无期徒刑', '有期徒刑', '拘役', '管制'
            ],
            '民法': [
                '物权', '债权', '人格权', '善意取得', '不当得利', '无因管理',
                '用益物权', '担保物权', '抵押权', '质权', '留置权', '居住权'
            ],
            '商经知': [
                '公司治理', '破产清算', '证券交易', '反垄断', '反不正当竞争',
                '股东大会', '董事会', '监事会', '清算组', '重整', '和解'
            ],
            '行政法': [
                '行政行为', '行政复议', '行政诉讼', '国家赔偿', '行政许可',
                '行政处罚', '行政强制', '行政确认', '行政给付'
            ],
            '民事诉讼法': [
                '管辖权异议', '举证责任', '证明标准', '简易程序', '普通程序',
                '财产保全', '先予执行', '支付令', '公示催告'
            ],
            '刑事诉讼法': [
                '侦查终结', '审查起诉', '强制措施', '取保候审', '监视居住',
                '死刑复核', '审判监督程序', '认罪认罚', '速裁程序'
            ],
            '三国法': [
                '国际法院', '国际仲裁', '引渡', '庇护', '冲突规范', '准据法',
                '法律冲突', '反致', '公共秩序保留', '国际商事仲裁'
            ],
            '理论法': [
                '法的本质', '法的特征', '法的作用', '法的价值', '法的要素',
                '法的渊源', '法律体系', '法的效力', '立法', '执法', '守法'
            ]
        }
        
        # 中等专属性关键词（权重3）
        self.medium_specific_keywords = {
            '刑法': [
                '盗窃', '诈骗', '抢劫', '故意杀人', '故意伤害', '强奸', '绑架',
                '非法拘禁', '敲诈勒索', '寻衅滋事', '聚众斗殴', '危险驾驶'
            ],
            '民法': [
                '合同', '侵权', '继承', '婚姻', '买卖', '租赁', '借款', '赠与',
                '违约', '损害赔偿', '遗嘱', '法定继承', '著作权', '专利权'
            ],
            '商经知': [
                '公司', '股东', '董事', '监事', '劳动合同', '保险', '证券',
                '票据', '合伙企业', '个人独资', '产品质量', '消费者权益'
            ],
            '民事诉讼法': [
                '起诉', '受理', '管辖', '原告', '被告', '第三人', '调解',
                '撤诉', '缺席判决', '二审', '上诉', '再审', '执行'
            ],
            '刑事诉讼法': [
                '立案', '侦查', '起诉', '审判', '执行', '犯罪嫌疑人',
                '被告人', '被害人', '辩护人', '逮捕', '拘留'
            ]
        }
        
        # 通用关键词（权重1）- 降低权重
        self.low_specific_keywords = {
            '通用': ['故意', '过失', '损害', '责任', '权利', '义务', '法律', '规定']
        }
        
        # 法条-科目映射
        self.law_to_subject = {
            '刑法': ['刑法'],
            '民法': ['民法典', '合同法', '物权法', '侵权责任法', '婚姻法', '继承法'],
            '商经知': ['公司法', '证券法', '保险法', '劳动法', '劳动合同法', '产品质量法', 
                      '反垄断法', '反不正当竞争法', '消费者权益保护法', '合伙企业法',
                      '个人独资企业法', '破产法', '企业破产法'],
            '行政法': ['行政处罚法', '行政许可法', '行政复议法', '行政诉讼法', '国家赔偿法'],
            '民事诉讼法': ['民事诉讼法'],
            '刑事诉讼法': ['刑事诉讼法'],
            '理论法': ['宪法', '立法法', '监察法'],
            '三国法': ['联合国海洋法公约', '国际货物销售合同公约']
        }
        
        # 排除词机制
        self.exclusion_patterns = {
            '刑法': {
                'if_contains': ['合同纠纷', '买卖合同', '租赁合同', '民事责任'],
                'reduce_weight': 0.3
            },
            '民法': {
                'if_contains': ['公司章程', '股东大会', '董事会', '破产程序'],
                'reduce_weight': 0.5
            }
        }
        
        # 案例类型识别模式
        self.case_patterns = {
            '刑事案例': ['犯罪嫌疑人', '被告人', '公诉', '辩护人', '判处', '有期徒刑', '刑罚'],
            '民事纠纷': ['原告', '被告', '第三人', '民事责任', '损害赔偿'],
            '商事案例': ['股东会', '董事会', '公司章程', '破产', '清算'],
            '行政案例': ['行政机关', '行政相对人', '行政复议', '行政诉讼', '行政处罚']
        }
    
    def extract_law_references(self, text: str) -> List[str]:
        """提取法条引用"""
        patterns = [
            r'《([^》]+法[^》]*)》',  # 《xxx法》
            r'《([^》]+条例[^》]*)》',  # 《xxx条例》
            r'《([^》]+规定[^》]*)》',  # 《xxx规定》
            r'《([^》]+公约[^》]*)》',  # 《xxx公约》
        ]
        
        references = []
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            references.extend(matches)
        
        return references
    
    def classify_by_law_references(self, text: str) -> Optional[str]:
        """根据法条引用分类"""
        references = self.extract_law_references(text)
        if not references:
            return None
        
        subject_scores = {}
        for ref in references:
            for subject, laws in self.law_to_subject.items():
                for law in laws:
                    if law in ref:
                        subject_scores[subject] = subject_scores.get(subject, 0) + 3
        
        if subject_scores:
            return max(subject_scores.items(), key=lambda x: x[1])[0]
        
        return None
    
    def detect_case_type(self, text: str) -> Optional[str]:
        """检测案例类型"""
        for case_type, patterns in self.case_patterns.items():
            if any(pattern in text for pattern in patterns):
                return case_type
        return None
    
    def enhanced_criminal_detection(self, text: str) -> bool:
        """增强的刑法检测"""
        # 检查刑法特征词组合
        criminal_combinations = [
            ['犯罪', '构成'],
            ['故意', '杀人'],
            ['过失', '致人'],
            ['盗窃', '数额'],
            ['诈骗', '虚构'],
            ['抢劫', '暴力'],
            ['不作为', '犯']
        ]
        
        for combo in criminal_combinations:
            if all(word in text for word in combo):
                return True
        
        # 检查案例性质
        criminal_indicators = ['公安', '检察院', '刑事', '犯罪嫌疑人', '被告人']
        if any(indicator in text for indicator in criminal_indicators):
            return True
        
        return False
    
    def distinguish_civil_commercial(self, text: str) -> Optional[str]:
        """区分民法与商经知"""
        # 商法特征强烈时，优先商经知
        commercial_strong = ['公司章程', '股东大会', '董事会', '破产程序', '证券交易', '劳动争议']
        if any(word in text for word in commercial_strong):
            return '商经知'
        
        # 纯民事关系时，优先民法
        civil_strong = ['夫妻关系', '继承纠纷', '相邻关系', '人格权', '物权纠纷']
        if any(word in text for word in civil_strong):
            return '民法'
        
        return None
    
    def calculate_keyword_scores(self, text: str) -> Dict[str, float]:
        """计算关键词得分"""
        text_lower = text.lower()
        subject_scores = {}
        
        # 高专属性关键词
        for subject, keywords in self.high_specific_keywords.items():
            score = 0
            for keyword in keywords:
                count = text_lower.count(keyword.lower())
                if count > 0:
                    score += count * 5
            if score > 0:
                subject_scores[subject] = score
        
        # 中等专属性关键词
        for subject, keywords in self.medium_specific_keywords.items():
            score = subject_scores.get(subject, 0)
            for keyword in keywords:
                count = text_lower.count(keyword.lower())
                if count > 0:
                    score += count * 3
            if score > subject_scores.get(subject, 0):
                subject_scores[subject] = score
        
        # 应用排除词机制
        for subject, exclusions in self.exclusion_patterns.items():
            if subject in subject_scores:
                for exclusion_word in exclusions['if_contains']:
                    if exclusion_word in text:
                        subject_scores[subject] *= exclusions['reduce_weight']
        
        return subject_scores
    
    def classify(self, question_text: str, answer_text: str = '') -> Tuple[Optional[str], Dict[str, any]]:
        """
        主分类函数
        返回：(预测科目, 详细信息)
        """
        full_text = question_text + ' ' + answer_text
        classification_info = {
            'law_references': [],
            'case_type': None,
            'keyword_scores': {},
            'final_scores': {},
            'method_used': ''
        }
        
        # 第一层：法条引用分析（权重60%）
        law_subject = self.classify_by_law_references(answer_text)  # 优先分析答案解析
        if not law_subject:
            law_subject = self.classify_by_law_references(question_text)
        
        classification_info['law_references'] = self.extract_law_references(full_text)
        
        if law_subject:
            classification_info['method_used'] = 'law_reference'
            classification_info['final_scores'][law_subject] = 60
            return law_subject, classification_info
        
        # 第二层：特殊规则检测
        # 增强刑法检测
        if self.enhanced_criminal_detection(full_text):
            classification_info['method_used'] = 'enhanced_criminal_detection'
            classification_info['final_scores']['刑法'] = 50
            return '刑法', classification_info
        
        # 民法与商经知区分
        civil_commercial = self.distinguish_civil_commercial(full_text)
        if civil_commercial:
            classification_info['method_used'] = 'civil_commercial_distinction'
            classification_info['final_scores'][civil_commercial] = 45
            return civil_commercial, classification_info
        
        # 第三层：关键词匹配分析（权重30%）
        keyword_scores = self.calculate_keyword_scores(full_text)
        classification_info['keyword_scores'] = keyword_scores
        
        if not keyword_scores:
            classification_info['method_used'] = 'no_match'
            return None, classification_info
        
        # 第四层：案例类型分析（权重10%）
        case_type = self.detect_case_type(full_text)
        classification_info['case_type'] = case_type
        
        # 综合评分
        final_scores = keyword_scores.copy()
        
        # 根据案例类型调整得分
        if case_type == '刑事案例' and '刑法' in final_scores:
            final_scores['刑法'] *= 1.3
        elif case_type == '商事案例' and '商经知' in final_scores:
            final_scores['商经知'] *= 1.2
        elif case_type == '行政案例' and '行政法' in final_scores:
            final_scores['行政法'] *= 1.5
        
        classification_info['final_scores'] = final_scores
        classification_info['method_used'] = 'keyword_matching'
        
        # 返回得分最高的科目
        predicted_subject = max(final_scores.items(), key=lambda x: x[1])[0]
        return predicted_subject, classification_info

def test_improved_classifier():
    """测试改进的分类器"""
    classifier = ImprovedLawClassifier()
    
    # 测试案例
    test_cases = [
        {
            'question': '甲故意杀害乙，关于犯罪构成的说法正确的是？',
            'answer': '根据《刑法》相关规定，故意杀人罪的构成要件...',
            'expected': '刑法'
        },
        {
            'question': '甲公司与乙公司签订买卖合同，关于违约责任...',
            'answer': '根据《民法典》第577条规定...',
            'expected': '民法'
        },
        {
            'question': '甲公司股东大会决议的效力问题...',
            'answer': '根据《公司法》第22条规定...',
            'expected': '商经知'
        }
    ]
    
    print("=== 改进分类器测试结果 ===")
    correct = 0
    total = len(test_cases)
    
    for i, case in enumerate(test_cases):
        predicted, info = classifier.classify(case['question'], case['answer'])
        is_correct = predicted == case['expected']
        correct += is_correct
        
        print(f"\n测试案例 {i+1}:")
        print(f"题目: {case['question'][:50]}...")
        print(f"预期: {case['expected']}")
        print(f"预测: {predicted}")
        print(f"正确: {'✓' if is_correct else '✗'}")
        print(f"分类方法: {info['method_used']}")
        print(f"得分详情: {info['final_scores']}")
    
    print(f"\n总体准确率: {correct/total*100:.1f}% ({correct}/{total})")

if __name__ == "__main__":
    test_improved_classifier()