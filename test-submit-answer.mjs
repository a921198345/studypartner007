import fetch from 'node-fetch';

async function testSubmitAnswer() {
  try {
    // 模拟一个会话ID（使用当前存在的会话ID）
    const sessionId = '1749711816536';
    const questionId = '1';
    const submittedAnswer = 'A';
    
    console.log('=== 测试提交答案 ===');
    console.log('会话ID:', sessionId);
    console.log('题目ID:', questionId);
    console.log('提交答案:', submittedAnswer);
    
    const response = await fetch(`http://localhost:3000/api/exams/questions/${questionId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submitted_answer: submittedAnswer,
        session_id: sessionId
      })
    });
    
    const responseText = await response.text();
    console.log('\n响应状态:', response.status);
    console.log('响应内容:', responseText);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('\n答案提交成功:');
      console.log('是否正确:', data.data.is_correct ? '✓' : '✗');
      console.log('正确答案:', data.data.correct_answer);
    }
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 检查是否安装了 node-fetch
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function ensureNodeFetch() {
  try {
    await import('node-fetch');
  } catch (error) {
    console.log('正在安装 node-fetch...');
    await execAsync('npm install node-fetch');
  }
}

ensureNodeFetch().then(() => {
  testSubmitAnswer();
});