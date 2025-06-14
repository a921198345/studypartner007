#!/bin/bash

# 手动上传民法题库的脚本

echo "=== 手动上传民法题库 ==="
echo "此脚本将直接处理民法客观题.docx文件"
echo ""

# 设置变量
PYTHON_PATH="/Users/acheng/Downloads/law-exam-assistant/venv_flask_api/bin/python"
SCRIPT_PATH="/Users/acheng/Downloads/law-exam-assistant/parse_questions_smart.py"
SOURCE_FILE="/Users/acheng/Downloads/law-exam-assistant/民法客观题.docx"
SUBJECT="民法"

# 检查文件是否存在
if [ ! -f "$SOURCE_FILE" ]; then
    echo "❌ 错误：找不到文件 $SOURCE_FILE"
    exit 1
fi

echo "1. 检查源文件..."
ls -lh "$SOURCE_FILE"

echo ""
echo "2. 解析题目..."
$PYTHON_PATH $SCRIPT_PATH "$SOURCE_FILE" "$SUBJECT" --output-json > minfa_parse_result.json

# 检查解析结果
if [ $? -eq 0 ]; then
    echo "✅ 解析成功！"
    echo ""
    echo "3. 解析结果摘要："
    $PYTHON_PATH -c "
import json
with open('minfa_parse_result.json', 'r') as f:
    data = json.load(f)
    print(f'总题目数: {data.get(\"total_questions\", 0)}')
    print(f'成功解析: {data.get(\"parsed_questions\", 0)}')
    print(f'格式错误: {len(data.get(\"format_issues\", {}))}')
    if data.get('auto_fixed_count', 0) > 0:
        print(f'自动修复: {data.get(\"auto_fixed_count\", 0)}')
"
    
    echo ""
    echo "4. 保存到数据库..."
    echo "执行以下Node.js脚本来保存数据："
    echo ""
    cat << 'EOF' > save-minfa-to-db.js
const mysql = require('mysql2/promise');
const fs = require('fs').promises;

async function saveToDatabase() {
    let connection;
    try {
        // 读取解析结果
        const data = JSON.parse(await fs.readFile('minfa_parse_result.json', 'utf8'));
        
        if (!data.questions || data.questions.length === 0) {
            console.log('没有可保存的题目');
            return;
        }
        
        // 连接数据库
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '8.141.4.192',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'law_user',
            password: process.env.DB_PASSWORD || 'Accd0726351x.',
            database: process.env.DB_NAME || 'law_exam_assistant',
            connectTimeout: 10000
        });
        
        console.log('数据库连接成功');
        
        let savedCount = 0;
        for (const question of data.questions) {
            try {
                // 检查题目是否已存在
                const [existing] = await connection.execute(
                    'SELECT id FROM questions WHERE question_code = ?',
                    [question.question_id]
                );
                
                if (existing.length > 0) {
                    // 更新现有题目
                    await connection.execute(
                        `UPDATE questions 
                         SET subject = ?, year = ?, question_text = ?, options_json = ?,
                             correct_answer = ?, explanation_text = ?, question_type = ?
                         WHERE question_code = ?`,
                        [
                            question.subject,
                            question.year,
                            question.question_text,
                            question.options,
                            question.correct_answer,
                            question.analysis,
                            question.question_type,
                            question.question_id
                        ]
                    );
                } else {
                    // 插入新题目
                    await connection.execute(
                        `INSERT INTO questions 
                         (question_code, subject, year, question_text, options_json, 
                          correct_answer, explanation_text, question_type)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            question.question_id,
                            question.subject,
                            question.year,
                            question.question_text,
                            question.options,
                            question.correct_answer,
                            question.analysis,
                            question.question_type
                        ]
                    );
                }
                savedCount++;
            } catch (dbError) {
                console.error(`保存题目 ${question.question_id} 失败:`, dbError.message);
            }
        }
        
        console.log(`成功保存 ${savedCount} 个题目到数据库`);
        
    } catch (error) {
        console.error('错误:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

saveToDatabase();
EOF
    
    echo "node save-minfa-to-db.js"
    echo ""
    echo "完成后，可以删除临时文件："
    echo "rm minfa_parse_result.json save-minfa-to-db.js"
    
else
    echo "❌ 解析失败！"
    echo "请检查错误信息并重试"
fi