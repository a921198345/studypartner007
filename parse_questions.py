import re
import json
import sys
import os
import mysql.connector
import argparse
from datetime import datetime
from docx import Document

def validate_question_format(text):
    """验证题目格式并返回问题列表"""
    issues = []
    
    # 检查题号格式
    if not re.search(r'【\d{8}】', text):
        issues.append("题号格式不正确，应为【8位数字】")
    
    # 检查选项数量
    options = re.findall(r'[A-D]\.', text)
    if len(options) != 4:
        issues.append(f"选项数量不正确，应有4个选项(A-D)，实际有{len(options)}个")
    
    # 检查选项格式统一性
    if not all(option in text for option in ["A.", "B.", "C.", "D."]):
        issues.append("选项标识不完整或格式不统一")
    
    # 检查解析标记
    if "【解析】" not in text:
        issues.append("缺少【解析】标记")
    
    # 检查是否有答案标识
    has_answer = any(pattern in text for pattern in [
        "答案：", "正确答案", "故选", "本题答案", "【答案】"
    ])
    if not has_answer:
        issues.append("解析中缺少明确的答案标识")
    
    # 检查多余空行
    if "\n\n\n" in text:
        issues.append("存在多余空行")
    
    return issues
   
def parse_question(text):
    """解析单个题目文本，提取题号、题干、选项、答案和解析"""
    # 正则表达式匹配题号
    question_id_match = re.search(r'【(\d+)】', text)
    if not question_id_match:
        return None
    
    question_id = question_id_match.group(1)
    
    # 提取年份
    year = int(question_id[:4])
    
    # 分离题干、选项和解析
    parts = text.split('【解析】')
    if len(parts) != 2:
        return None
    
    question_part = parts[0]
    analysis = parts[1].strip()
    
    # 提取选项
    options_pattern = r'([A-D]\..*?)(?=[A-D]\.|【解析】|$)'
    options_matches = re.findall(options_pattern, question_part, re.DOTALL)
    
    if not options_matches:
        return None
    
    # 提取题干（题号之后到第一个选项之前的文本）
    question_text_match = re.search(r'】(.*?)(?=[A-D]\.)', question_part, re.DOTALL)
    if not question_text_match:
        return None
    
    question_text = question_text_match.group(1).strip()
    
    # 格式化选项为JSON
    options_dict = {}
    for option in options_matches:
        option = option.strip()
        if option:
            key = option[0]  # 选项字母A、B、C、D
            value = option[2:].strip()  # 选项内容
            options_dict[key] = value
               
    # 初始化 correct_answer 变量
    correct_answer = ""
                   
    # 查找答案 - 最直接的方法：找最明确的【答案】标记
    answer_explicit = re.search(r'【答案】\s*([A-D]+)', text)
    if answer_explicit:
        correct_answer = answer_explicit.group(1).strip()
    else:
        # 尝试其他格式
        answer_patterns = [
            r'答案[：:]\s*([A-D]+)',           # "答案：B" 或 "答案:B"
            r'正确答案[是为：:]\s*([A-D]+)',    # "正确答案是B"
            r'故\s*(?:选择|选)?\s*([A-D]+)[。，,\.]', # "故选B。"
            r'本题(?:答案)?(?:是|为|选)\s*([A-D]+)', # "本题为B"
            r'综上所述\s*[，,]?\s*本题的?正确答案[为是:：]?\s*([A-D]+)', # "综上所述，本题正确答案为B"
            r'[，,\s]([A-D])\s*[选]?项?正确[。，,\s]',  # "，B项正确，"
        ]
        
        for pattern in answer_patterns:
            answer_match = re.search(pattern, analysis, re.IGNORECASE)
            if answer_match:
                correct_answer = answer_match.group(1).strip()
                break

    # 如果使用上面的方法仍然没找到答案，尝试最后一段文本
    if not correct_answer:
        # 获取解析的最后一段
        last_paragraph = analysis.split('\n')[-1].strip()
        # 查找单个字母形式的答案（通常在最后一段）
        answer_match = re.search(r'[^A-D]([A-D])[^A-D]', last_paragraph)
        if answer_match:
            correct_answer = answer_match.group(1)

    # 根据答案长度判断题型 (现在 correct_answer 一定有值)
    if correct_answer and len(correct_answer) > 1:
        question_type = 2  # 多选
    else:
        question_type = 1  # 单选
    
    return {
        'question_id': question_id,
        'year': year,
        'question_text': question_text,
        'options': json.dumps(options_dict, ensure_ascii=False),
        'correct_answer': correct_answer,
        'analysis': analysis,
        'question_type': question_type
    }

def extract_questions_from_doc(file_path, subject, validate=False):
    """从Word文档中提取所有题目"""
    doc = Document(file_path)
    full_text = ""
    
    # 将所有段落合并为一个文本
    for para in doc.paragraphs:
        full_text += para.text + "\n"
    
    # 按题号分割文本
    question_pattern = r'【\d+】.*?(?=【\d+】|$)'
    questions_text = re.findall(question_pattern, full_text, re.DOTALL)
    
    parsed_questions = []
    format_issues = {}
    
    for q_text in questions_text:
        # 如果需要验证格式
        if validate:
            issues = validate_question_format(q_text)
            if issues:
                # 获取题号
                question_id_match = re.search(r'【(\d+)】', q_text)
                question_id = question_id_match.group(1) if question_id_match else "未知题号"
                format_issues[question_id] = {
                    "text": q_text[:100] + "...",
                    "issues": issues
                }
        
        parsed = parse_question(q_text)
        if parsed:
            parsed['subject'] = subject
            parsed_questions.append(parsed)
       
    return parsed_questions, format_issues
   
def save_to_database(questions, db_config):
    """将解析后的题目保存到数据库"""
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
           
    for question in questions:
        # 检查是否已存在该题目
        cursor.execute(
            "SELECT id FROM questions WHERE question_code = %s",
            (question['question_id'],)
        )
        
        if cursor.fetchone():
            # 更新现有题目
            cursor.execute("""
                UPDATE questions
                SET subject = %s, year = %s, question_text = %s, options_json = %s,
                    correct_answer = %s, explanation_text = %s, question_type = %s
                WHERE question_code = %s
            """, (
                question['subject'], question['year'], question['question_text'],
                question['options'], question['correct_answer'], question['analysis'],
                question['question_type'], question['question_id']
            ))
        else:
            # 插入新题目
            cursor.execute("""
                INSERT INTO questions
                (question_code, subject, year, question_text, options_json, correct_answer, explanation_text, question_type)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                question['question_id'], question['subject'], question['year'],
                question['question_text'], question['options'], question['correct_answer'],
                question['analysis'], question['question_type']
            ))
           
    conn.commit()
    cursor.close()
    conn.close()
   
    missing_answers = 0
    for question in questions:
        if not question['correct_answer']:
            missing_answers += 1
            # 只输出前几个无答案的题目作为示例
            if missing_answers <= 5:
                print(f"警告: 题目 {question['question_id']} 未找到答案，前100个字符: {question['question_text'][:100]}...")

    print(f"注意: 共有 {missing_answers} 个题目未能提取到答案 (总共 {len(questions)} 题)")

def apply_manual_answers(questions):
    """应用手动指定的答案规则"""
    manual_answers = {
        "20210201": "B",  # 女舞蹈家关某在某小学参加活动的题目
        # 添加更多规则，根据图片中的题号和答案
    }
    
    for q in questions:
        if q['question_id'] in manual_answers:
            q['correct_answer'] = manual_answers[q['question_id']]
    
    return questions
   
def main():
    # 使用argparse解析命令行参数
    parser = argparse.ArgumentParser(description='解析法考题目并存入数据库')
    parser.add_argument('file_path', help='Word文件路径')
    parser.add_argument('subject', help='学科名称')
    parser.add_argument('--validate', action='store_true', help='验证题目格式并输出问题')
    parser.add_argument('--output-json', action='store_true', help='以JSON格式输出结果')
    args = parser.parse_args()
    
    file_path = args.file_path
    subject = args.subject
    validate = args.validate
    output_json = args.output_json
    
    if not os.path.exists(file_path):
        error_msg = f"错误: 文件 '{file_path}' 不存在"
        if output_json:
            print(json.dumps({"error": error_msg}, ensure_ascii=False))
        else:
            print(error_msg)
        return
    
    # 数据库配置
    db_config = {
        'host': '8.141.4.192',  # 或者宝塔面板中的数据库地址
        'user': 'law_user',  # 替换为你的数据库用户名
        'password': 'Accd0726351x.',  # 替换为你的数据库密码
        'database': 'law_exam_assistant'  # 替换为你的数据库名
    }
    
    try:
        print(f"正在解析文件: {file_path}...")
        questions, format_issues = extract_questions_from_doc(file_path, subject, validate)
        questions = apply_manual_answers(questions)  # 应用手动规则
        
        # 准备输出信息
        result = {
            "success": True,
            "message": f"成功解析 {len(questions)} 个题目" + (f"，但有 {len(format_issues)} 个题目存在格式问题" if format_issues else ""),
            "total_questions": len(questions) + len(format_issues),
            "parsed_questions": len(questions),
            "format_issues": format_issues if validate else {}
        }
        
        # 总是保存成功解析的题目到数据库，无论是否有格式问题
        if len(questions) > 0:
            print(f"正在将 {len(questions)} 个成功解析的题目保存到数据库...")
            save_to_database(questions, db_config)
            print(f"成功保存 {len(questions)} 个题目到数据库")
        
        # 输出结果
        if output_json:
            print(json.dumps(result, ensure_ascii=False))
        else:
            print(f"共解析出 {len(questions)} 个题目")
            if format_issues:
                print(f"发现 {len(format_issues)} 个题目存在格式问题")
                for q_id, issue in format_issues.items():
                    print(f"题目 {q_id}: {', '.join(issue['issues'])}")
    
    except Exception as e:
        error_msg = f"程序出错: {e}"
        if output_json:
            print(json.dumps({"error": error_msg}, ensure_ascii=False))
        else:
            print(error_msg)
   
if __name__ == "__main__":
    main()