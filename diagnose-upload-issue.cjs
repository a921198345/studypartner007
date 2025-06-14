const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;

const execAsync = promisify(exec);

async function diagnose() {
  console.log('='.repeat(60));
  console.log('诊断上传问题');
  console.log('='.repeat(60));

  // 1. 检查Python环境
  console.log('\n1. 检查Python环境');
  try {
    const pythonPath = path.join(process.cwd(), 'venv_flask_api/bin/python');
    const { stdout: pythonVersion } = await execAsync(`${pythonPath} --version`);
    console.log(`✓ Python版本: ${pythonVersion.trim()}`);
  } catch (error) {
    console.log(`✗ Python环境错误: ${error.message}`);
  }

  // 2. 检查python-docx模块
  console.log('\n2. 检查python-docx模块');
  try {
    const pythonPath = path.join(process.cwd(), 'venv_flask_api/bin/python');
    await execAsync(`${pythonPath} -c "import docx; print('docx模块版本:', docx.__version__)"`);
    console.log('✓ python-docx模块已安装');
  } catch (error) {
    console.log('✗ python-docx模块未安装');
    console.log('  请运行: venv_flask_api/bin/pip install python-docx');
  }

  // 3. 测试解析脚本
  console.log('\n3. 测试解析脚本');
  try {
    const pythonPath = path.join(process.cwd(), 'venv_flask_api/bin/python');
    const scriptPath = path.join(process.cwd(), 'parse_questions_fixed.py');
    
    // 查找一个测试文件
    const testFile = path.join(process.cwd(), '2013-2022客观题分科真题：刑法.docx');
    
    // 检查文件是否存在
    try {
      await fs.access(testFile);
      console.log(`  使用测试文件: ${testFile}`);
      
      // 运行解析脚本
      const { stdout, stderr } = await execAsync(
        `${pythonPath} ${scriptPath} "${testFile}" "刑法" --output-json`,
        { maxBuffer: 10 * 1024 * 1024 }
      );
      
      if (stderr && !stderr.includes('WARNING')) {
        console.log(`  警告: ${stderr}`);
      }
      
      // 解析结果
      const result = JSON.parse(stdout);
      console.log(`✓ 解析脚本运行成功`);
      console.log(`  总题目: ${result.total_questions}`);
      console.log(`  成功解析: ${result.parsed_questions}`);
      console.log(`  解析失败: ${Object.keys(result.format_issues || {}).length}`);
      
    } catch (error) {
      console.log(`✗ 测试文件不存在: ${testFile}`);
    }
    
  } catch (error) {
    console.log(`✗ 解析脚本错误: ${error.message}`);
    if (error.stdout) console.log('  输出:', error.stdout);
    if (error.stderr) console.log('  错误:', error.stderr);
  }

  // 4. 检查数据库连接
  console.log('\n4. 检查数据库连接');
  try {
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'law_exam_assistant',
      port: process.env.DB_PORT || 3306
    });
    
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM questions');
    console.log(`✓ 数据库连接正常，当前题目数: ${rows[0].count}`);
    
    await connection.end();
  } catch (error) {
    console.log(`✗ 数据库连接错误: ${error.message}`);
  }

  console.log('\n' + '='.repeat(60));
}

// 加载环境变量
require('dotenv').config();

// 运行诊断
diagnose().catch(console.error);