// 测试Node.js调用Python脚本的超时问题
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

async function testPythonCall() {
  const scriptPath = path.join(process.cwd(), 'parse_questions.py');
  const filePath = path.join(process.cwd(), 'uploads/民法_1750666557496.docx');
  const subject = '民法';
  
  const pythonCommand = `python "${scriptPath}" "${filePath}" "${subject}" --validate --output-json`;
  
  console.log('执行命令:', pythonCommand);
  console.log('开始时间:', new Date().toISOString());
  
  try {
    // 测试不同的超时设置
    const timeouts = [10000, 30000, 60000, 120000]; // 10s, 30s, 60s, 120s
    
    for (const timeout of timeouts) {
      console.log(`\n测试超时设置: ${timeout}ms (${timeout/1000}秒)`);
      
      const startTime = Date.now();
      try {
        const { stdout, stderr } = await execAsync(pythonCommand, {
          timeout: timeout,
          maxBuffer: 10 * 1024 * 1024 // 10MB
        });
        
        const elapsed = Date.now() - startTime;
        console.log(`成功！耗时: ${elapsed}ms`);
        
        // 解析输出
        try {
          const result = JSON.parse(stdout);
          console.log('解析结果:', {
            success: result.success,
            total_questions: result.total_questions,
            parsed_questions: result.parsed_questions
          });
        } catch (e) {
          console.log('输出不是JSON格式');
        }
        
        if (stderr) {
          console.log('stderr输出:', stderr);
        }
        
        // 成功就退出循环
        break;
      } catch (error) {
        const elapsed = Date.now() - startTime;
        console.log(`失败！耗时: ${elapsed}ms`);
        console.log('错误类型:', error.constructor.name);
        console.log('错误信息:', error.message);
        
        if (error.signal === 'SIGTERM') {
          console.log('=> 进程被SIGTERM信号终止（超时）');
        }
      }
    }
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 检查Python环境
async function checkPythonEnv() {
  console.log('\n检查Python环境:');
  
  try {
    const { stdout: pythonVersion } = await execAsync('python --version');
    console.log('Python版本:', pythonVersion.trim());
    
    const { stdout: pipList } = await execAsync('pip list | grep -E "docx|mysql"');
    console.log('相关包:');
    console.log(pipList);
  } catch (error) {
    console.error('检查Python环境失败:', error.message);
  }
}

// 主函数
async function main() {
  await checkPythonEnv();
  await testPythonCall();
}

main().catch(console.error);