// 设置环境变量并测试数据库连接
import { testConnection } from './lib/db.js';

// 设置环境变量 (注意：这些值需要根据实际情况调整)
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = ''; // 默认root用户可能没有密码
process.env.DB_NAME = 'law_exam_assistant';

async function main() {
  console.log('使用以下配置测试数据库连接:');
  console.log(`- DB_HOST: ${process.env.DB_HOST}`);
  console.log(`- DB_USER: ${process.env.DB_USER}`);
  console.log(`- DB_NAME: ${process.env.DB_NAME}`);
  console.log(`- DB_PASSWORD: ${process.env.DB_PASSWORD ? '已设置' : '未设置'}`);
  
  try {
    // 测试连接
    const isConnected = await testConnection();
    console.log(`数据库连接测试结果: ${isConnected ? '成功' : '失败'}`);
    
    return isConnected;
  } catch (error) {
    console.error('连接测试失败:', error);
    return false;
  }
}

main().catch(console.error); 