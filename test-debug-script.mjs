// 测试调试版本的Python脚本
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

async function testDebugScript() {
  const scriptPath = path.join(process.cwd(), 'debug-parse-questions.py');
  const filePath = path.join(process.cwd(), 'uploads/民法_1750666557496.docx');
  const subject = '民法';
  
  const pythonCommand = `python "${scriptPath}" "${filePath}" "${subject}" --output-json`;
  
  console.log('执行调试脚本:', pythonCommand);
  console.log('开始时间:', new Date().toISOString());
  
  try {
    const startTime = Date.now();
    const { stdout, stderr } = await execAsync(pythonCommand, {
      timeout: 30000, // 30秒超时
      maxBuffer: 10 * 1024 * 1024
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`\n执行成功！耗时: ${elapsed}ms`);
    
    console.log('\n=== STDERR (调试信息) ===');
    console.log(stderr);
    
    console.log('\n=== STDOUT (输出结果) ===');
    console.log(stdout);
    
    // 尝试解析JSON
    try {
      const result = JSON.parse(stdout);
      console.log('\n解析后的结果:', result);
    } catch (e) {
      console.log('\n输出不是有效的JSON');
    }
    
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.log(`\n执行失败！耗时: ${elapsed}ms`);
    console.log('错误信息:', error.message);
    
    if (error.signal === 'SIGTERM') {
      console.log('=> 进程被SIGTERM信号终止（超时）');
    }
    
    if (error.stdout) {
      console.log('\n=== STDOUT ===');
      console.log(error.stdout);
    }
    
    if (error.stderr) {
      console.log('\n=== STDERR ===');
      console.log(error.stderr);
    }
  }
}

// 直接测试Python命令
async function testDirectPython() {
  console.log('\n\n=== 测试直接Python命令 ===');
  
  try {
    const { stdout, stderr } = await execAsync('python -c "print(\'Hello from Python\')"', {
      timeout: 5000
    });
    
    console.log('直接Python命令成功');
    console.log('STDOUT:', stdout);
    console.log('STDERR:', stderr);
  } catch (error) {
    console.log('直接Python命令失败:', error.message);
  }
}

async function main() {
  await testDirectPython();
  await testDebugScript();
}

main().catch(console.error);