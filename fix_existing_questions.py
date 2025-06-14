#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
修复数据库中已存在的刑法题目选项问题
"""

import mysql.connector
import json
import re

def fix_options(options_json, explanation_text):
    """修复选项中包含的解析内容"""
    try:
        options = json.loads(options_json)
        fixed_options = {}
        
        for key in ['A', 'B', 'C', 'D']:
            if key in options:
                option_text = options[key]
                
                # 检查是否包含解析内容的特征
                if any(phrase in option_text for phrase in ['错误', '正确', '项是', '项错误', '理由在于', '【答案】']):
                    # 尝试提取真正的选项内容
                    # 通常解析内容会以"A项正确"、"B错误"等开头
                    clean_match = re.match(r'^[A-D]\s*[\.。]\s*([^。！？\n]+)', option_text)
                    if clean_match:
                        fixed_options[key] = clean_match.group(1).strip()
                    else:
                        # 如果匹配失败，尝试提取第一句话
                        first_sentence = re.split(r'[。！？\n]', option_text)[0]
                        if len(first_sentence) > 10:  # 确保不是太短的内容
                            fixed_options[key] = first_sentence.strip()
                        else:
                            fixed_options[key] = "[选项内容需要手动修复]"
                else:
                    # 选项看起来正常
                    fixed_options[key] = option_text
            else:
                fixed_options[key] = "[选项缺失]"
        
        return json.dumps(fixed_options, ensure_ascii=False)
    except:
        return options_json

def main():
    # 数据库配置
    db_config = {
        'host': '8.141.4.192',
        'user': 'law_user',
        'password': 'Accd0726351x.',
        'database': 'law_exam_assistant'
    }
    
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
    
    try:
        # 查询所有刑法题目
        cursor.execute("""
            SELECT id, question_code, options_json, explanation_text 
            FROM questions 
            WHERE subject = '刑法'
        """)
        
        rows = cursor.fetchall()
        print(f"找到 {len(rows)} 个刑法题目")
        
        fixed_count = 0
        
        for row in rows:
            q_id, q_code, options_json, explanation_text = row
            
            # 检查选项是否包含解析内容
            try:
                options = json.loads(options_json)
                needs_fix = False
                
                for key, value in options.items():
                    if any(phrase in value for phrase in ['错误', '正确', '项是', '项错误', '理由在于', '【答案】']):
                        needs_fix = True
                        break
                
                if needs_fix:
                    print(f"\n修复题目 {q_code}")
                    fixed_options = fix_options(options_json, explanation_text)
                    
                    # 更新数据库
                    cursor.execute("""
                        UPDATE questions 
                        SET options_json = %s 
                        WHERE id = %s
                    """, (fixed_options, q_id))
                    
                    fixed_count += 1
                    
                    if fixed_count % 10 == 0:
                        conn.commit()
                        print(f"已修复 {fixed_count} 个题目")
                        
            except Exception as e:
                print(f"处理题目 {q_code} 时出错: {e}")
        
        # 提交最后的更改
        conn.commit()
        print(f"\n修复完成！共修复了 {fixed_count} 个题目")
        
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()