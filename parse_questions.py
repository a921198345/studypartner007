import re
import json
import sys
import os
import mysql.connector
import argparse
from datetime import datetime
from docx import Document

def validate_question_format(text):
    """验证题目格式并返回问题列表 - 使用与解析逻辑一致的验证"""
    issues = []
    
    # 检查题号格式 (宽松检查)
    if not re.search(r'【\d+】', text):
        issues.append("题号格式不正确")
    
    # 检查选项存在性 - 使用与parse_question相同的逻辑
    has_options = False
    
    # 查找各种格式的选项标记
    option_patterns = [
        r'[A-D]\s*\.',      # A.
        r'[A-D]\s*\uff0e',  # A．(全角点)
        r'[A-D]\s*\u3001',  # A、
    ]
    
    for pattern in option_patterns:
        if len(re.findall(pattern, text)) >= 1:
            has_options = True
            break
    
    # 如果还没找到，尝试其他检查
    if not has_options:
        # 检查是否有明显的选项行
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if re.match(r'^[A-D][\s\.\uff0e\u3001]', line) and len(line) > 3:
                has_options = True
                break
    
    if not has_options:
        issues.append(f"选项过少，至少需要1个选项，实际有0个")
    
    # 检查解析标记 (更宽松检查 - 只要有解析相关内容即可)
    if not any(keyword in text for keyword in ["【解析】", "解析", "答案", "解答"]):
        issues.append("缺少解析内容")
    
    return issues
   
def parse_question(text):
    """解析单个题目文本，提取题号、题干、选项、答案和解析 - 优化版本"""
    # 正则表达式匹配题号
    question_id_match = re.search(r'【(\d+)】', text)
    if not question_id_match:
        return None
    
    question_id = question_id_match.group(1)
    
    # 提取年份
    year = int(question_id[:4])
    
    # 更灵活地分离题干、选项和解析
    # 优先按【解析】分割，如果没有则尝试其他标记
    analysis = ""
    question_part = text
    
    # 多种解析标记的分割方式
    split_patterns = [
        r'【解析】',
        r'解析：',
        r'解析:',
        r'【答案及解析】',
        r'【分析】'
    ]
    
    for pattern in split_patterns:
        parts = re.split(pattern, text, maxsplit=1)
        if len(parts) == 2:
            question_part = parts[0]
            analysis = parts[1].strip()
            break
    
    # 如果没有找到解析标记，尝试从文本末尾推断解析部分
    if not analysis:
        # 查找最后一个选项后的内容作为解析
        last_option_match = re.search(r'([A-D]\..*?)(\n|$)', question_part, re.DOTALL)
        if last_option_match:
            # 从最后一个选项后开始的内容可能是解析
            remaining_text = text[last_option_match.end():]
            if remaining_text.strip():
                analysis = remaining_text.strip()
                question_part = text[:last_option_match.end()]
    
    # 更简化有效的选项提取逻辑
    options_matches = []
    
    # 方法1: 先找到所有A、B、C、D的位置，然后智能分割
    option_markers = []
    for letter in ['A', 'B', 'C', 'D']:
        # 查找各种格式的选项标记
        patterns = [
            rf'\b{letter}\s*\.',      # A.
            rf'\b{letter}\s*\uff0e',  # A．(全角点)
            rf'\b{letter}\s*\u3001',  # A、
        ]
        for pattern in patterns:
            for match in re.finditer(pattern, question_part):
                option_markers.append({
                    'letter': letter,
                    'start': match.start(),
                    'end': match.end(),
                    'pattern': pattern
                })
    
    # 按位置排序
    option_markers.sort(key=lambda x: x['start'])
    
    # 如果找到了足够的选项标记，提取内容
    if len(option_markers) >= 2:
        for i, marker in enumerate(option_markers):
            start = marker['end']
            
            # 确定内容结束位置
            if i + 1 < len(option_markers):
                # 下一个选项标记的开始
                end = option_markers[i + 1]['start']
            else:
                # 最后一个选项，到解析标记或文本结束
                analysis_pos = question_part.find('【解析】', start)
                if analysis_pos != -1:
                    end = analysis_pos
                else:
                    end = len(question_part)
            
            # 提取并清理内容
            content = question_part[start:end].strip()
            # 移除可能混入的其他选项标记
            content = re.sub(r'\s*[A-D]\s*[．.\u3001].*$', '', content).strip()
            
            if content and len(content) > 1:
                options_matches.append(f"{marker['letter']}.{content}")
    
    # 方法2: 如果上面失败，尝试标准的正则匹配
    if not options_matches:
        patterns = [
            r'([A-D]\..*?)(?=\s*[A-D]\.|【解析】|$)',      # A.内容
            r'([A-D]\s*\uff0e.*?)(?=\s*[A-D]\s*\uff0e|【解析】|$)',  # A．内容
            r'([A-D]\s*\u3001.*?)(?=\s*[A-D]\s*\u3001|【解析】|$)',   # A、内容
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, question_part, re.DOTALL)
            if len(matches) >= 2:
                options_matches = matches
                break
    
    # 方法3: 按行处理
    if not options_matches:
        lines = question_part.split('\n')
        for line in lines:
            line = line.strip()
            # 检查是否是选项行
            if re.match(r'^[A-D][\s\.\uff0e\u3001]', line) and len(line) > 3:
                options_matches.append(line)
    
    # 方法4: 最后尝试 - 查找所有可能的选项文本
    if not options_matches:
        all_options = re.findall(r'[A-D][\s\.\uff0e\u3001][^\n]*', question_part)
        if len(all_options) >= 2:
            options_matches = all_options
    
    if not options_matches:
        return None  # 如果完全没有选项，返回None
    
    # 提取题干（题号之后到第一个选项之前的文本）
    question_text_match = re.search(r'】(.*?)(?=[A-D]\.)', question_part, re.DOTALL)
    if not question_text_match:
        # 如果标准匹配失败，尝试更灵活的匹配（处理 A ． 格式）
        question_text_match = re.search(r'】(.*?)(?=[A-D]\s*[．.])', question_part, re.DOTALL)
    if not question_text_match:
        # 最后尝试：直接从题号后到第一个选项标记
        question_text_match = re.search(r'】(.+?)(?=A\s*[．.、])', text, re.DOTALL)
    
    if not question_text_match:
        return None
    
    question_text = question_text_match.group(1).strip()
    
    # 格式化选项为字典
    options_dict = {}
    for option in options_matches:
        option = option.strip()
        if option and len(option) > 2:
            key = option[0]  # 选项字母A、B、C、D
            value = option[2:].strip()  # 选项内容，去掉前面的"A."等
            if value:  # 确保选项内容不为空
                options_dict[key] = value
               
    # 初始化 correct_answer 变量
    correct_answer = ""
                   
    # 扩展的答案提取逻辑 - 更多模式匹配
    answer_patterns = [
        r'【答案】\s*([A-D]+)',                    # "【答案】B"
        r'答案[：:]\s*([A-D]+)',                   # "答案：B" 或 "答案:B"
        r'正确答案[是为：:]\s*([A-D]+)',            # "正确答案是B"
        r'故\s*(?:选择|选)?\s*([A-D]+)[。，,\.\s]', # "故选B。"
        r'本题(?:答案)?(?:是|为|选)\s*([A-D]+)',     # "本题为B" 
        r'综上所述\s*[，,]?\s*本题的?正确答案[为是:：]?\s*([A-D]+)', # "综合所述，本题正确答案为B"
        r'[，,\s]([A-D])\s*[选]?项?正确[。，,\s]',     # "，B项正确，"
        r'选择\s*([A-D]+)[。，,\.]',                # "选择B。"
        r'应当选择\s*([A-D]+)',                     # "应当选择B"
        r'应该选择\s*([A-D]+)',                     # "应该选择B"
        r'([A-D]+)\s*是正确的',                     # "B是正确的"
        r'([A-D]+)\s*正确',                        # "B正确"
        r'选择\s*([A-D]+)\s*选项',                 # "选择B选项"
    ]
    
    # 首先在解析部分查找答案
    search_text = analysis if analysis else text
    for pattern in answer_patterns:
        answer_match = re.search(pattern, search_text, re.IGNORECASE)
        if answer_match:
            correct_answer = answer_match.group(1).strip().upper()
            break

    # 如果在解析中没找到，在整个文本中查找
    if not correct_answer:
        for pattern in answer_patterns:
            answer_match = re.search(pattern, text, re.IGNORECASE)
            if answer_match:
                correct_answer = answer_match.group(1).strip().upper()
                break

    # 最后尝试：查找解析末尾的单个字母
    if not correct_answer and analysis:
        # 获取解析的最后几行
        analysis_lines = analysis.split('\n')
        for line in reversed(analysis_lines[-3:]):  # 查看最后3行
            line = line.strip()
            if line:
                # 查找行中的单个字母答案
                single_letter_match = re.search(r'\b([A-D])\b', line)
                if single_letter_match:
                    correct_answer = single_letter_match.group(1)
                    break

    # 根据答案长度判断题型
    if correct_answer and len(correct_answer) > 1:
        question_type = 2  # 多选
    else:
        question_type = 1  # 单选
    
    return {
        'question_id': question_id,
        'year': year,
        'question_text': question_text,
        'options': options_dict,  # 直接返回字典
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
    
    new_questions = 0
    updated_questions = 0
           
    try:
        for question in questions:
            # 将选项字典转换为JSON字符串
            options_json = json.dumps(question['options'], ensure_ascii=False)
            
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
                        correct_answer = %s, explanation_text = %s, question_type = %s,
                        updated_at = NOW()
                    WHERE question_code = %s
                """, (
                    question['subject'], question['year'], question['question_text'],
                    options_json, question['correct_answer'], question['analysis'],
                    question['question_type'], question['question_id']
                ))
                updated_questions += 1
            else:
                # 插入新题目
                cursor.execute("""
                    INSERT INTO questions
                    (question_code, subject, year, question_text, options_json, correct_answer, explanation_text, question_type)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    question['question_id'], question['subject'], question['year'],
                    question['question_text'], options_json, question['correct_answer'],
                    question['analysis'], question['question_type']
                ))
                new_questions += 1
           
        conn.commit()
        print(f"数据库保存成功：新增 {new_questions} 题，更新 {updated_questions} 题")
        
    except Exception as e:
        conn.rollback()
        print(f"数据库保存失败：{e}")
        raise
    finally:
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
        # 只在非JSON模式下输出调试信息
        if not output_json:
            print(f"正在解析文件: {file_path}...")
        
        questions, format_issues = extract_questions_from_doc(file_path, subject, validate)
        questions = apply_manual_answers(questions)  # 应用手动规则
        
        # 保存到数据库 - 仅在非JSON模式下执行
        if questions and not output_json:
            print(f"准备保存 {len(questions)} 个题目到数据库...")
            save_to_database(questions, db_config)
            
            # 统计数据库中的总题目数
            try:
                conn = mysql.connector.connect(**db_config)
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM questions")
                total_count = cursor.fetchone()[0]
                cursor.close()
                conn.close()
                print(f"数据库中现有题目总数: {total_count}")
            except:
                pass
        
        # 准备输出信息
        result = {
            "success": True,
            "message": f"成功解析 {len(questions)} 个题目" + (f"，但有 {len(format_issues)} 个题目存在格式问题" if format_issues else ""),
            "total_questions": len(questions) + len(format_issues),
            "parsed_questions": len(questions),
            "questions": questions if output_json else [
                {
                    "question_id": q["question_id"],
                    "question_text": q["question_text"][:100] + "..." if len(q["question_text"]) > 100 else q["question_text"],
                    "correct_answer": q["correct_answer"],
                    "has_answer": bool(q["correct_answer"])
                } for q in questions
            ],  # JSON模式下输出完整题目数据
            "format_issues": format_issues if validate else {}
        }
        
        # 输出结果
        if output_json:
            print(json.dumps(result, ensure_ascii=False))
        else:
            print(f"共解析出 {len(questions)} 个题目")
            if format_issues:
                print(f"发现 {len(format_issues)} 个题目存在格式问题")
                for q_id, issue in format_issues.items():
                    print(f"题目 {q_id}: {', '.join(issue['issues'])}")
            
            # 统计答案情况
            missing_answers = sum(1 for q in questions if not q['correct_answer'])
            if missing_answers > 0:
                print(f"\n注意: 共有 {missing_answers} 个题目没有找到答案")
    
    except Exception as e:
        error_msg = f"程序出错: {e}"
        if output_json:
            print(json.dumps({"error": error_msg}, ensure_ascii=False))
        else:
            print(error_msg)
   
if __name__ == "__main__":
    main()