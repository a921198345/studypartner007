/**
 * 本地开发环境设置脚本
 * 此脚本用于设置本地开发环境，包括：
 * 1. 创建必要的.env.local文件
 * 2. 检查MySQL服务并创建必要的数据库和表
 * 3. 修正Redis配置以允许无密码连接
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { initializeDatabase } = require('./init-db');

// 检查MySQL服务是否运行
function checkMysqlService() {
  try {
    console.log('检查MySQL服务状态...');
    
    let running = false;
    
    try {
      // 尝试不同的命令检测MySQL服务
      if (process.platform === 'darwin') {  // macOS
        const result = execSync('ps aux | grep -v grep | grep mysqld').toString();
        running = result.includes('mysqld');
      } else if (process.platform === 'linux') {  // Linux
        const result = execSync('systemctl status mysql || systemctl status mysqld').toString();
        running = result.includes('active (running)');
      } else if (process.platform === 'win32') {  // Windows
        const result = execSync('sc query MySQL || sc query "MySQL80"').toString();
        running = result.includes('RUNNING');
      }
    } catch (err) {
      // 命令可能因为服务不存在而失败，所以捕获错误
      running = false;
    }
    
    if (!running) {
      console.log('\x1b[31m%s\x1b[0m', '❌ MySQL服务未启动！');
      console.log('请首先启动MySQL服务，然后再运行此脚本。');
      console.log('启动MySQL服务的命令示例：');
      
      if (process.platform === 'darwin') {
        console.log('  brew services start mysql');
        console.log('  或');
        console.log('  sudo /usr/local/mysql/support-files/mysql.server start');
      } else if (process.platform === 'linux') {
        console.log('  sudo systemctl start mysql');
        console.log('  或');
        console.log('  sudo service mysql start');
      } else if (process.platform === 'win32') {
        console.log('  net start MySQL');
        console.log('  或在服务管理中手动启动MySQL服务');
      }
      
      return false;
    }
    
    console.log('\x1b[32m%s\x1b[0m', '✅ MySQL服务已启动');
    return true;
  } catch (error) {
    console.error('检查MySQL服务时出错:', error);
    return false;
  }
}

// 创建本地环境配置文件
function createEnvLocalFile() {
  try {
    console.log('创建本地环境配置文件...');
    
    const envLocalContent = `# 本地环境配置（由setup-local.js生成）

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=law_exam_assistant

# Redis配置 - 本地开发无需密码
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# 其他配置项...
`;
    
    fs.writeFileSync(path.join(__dirname, '../.env.local'), envLocalContent);
    console.log('\x1b[32m%s\x1b[0m', '✅ .env.local文件创建成功');
    return true;
  } catch (error) {
    console.error('创建.env.local文件失败:', error);
    return false;
  }
}

// 主函数
async function setup() {
  console.log('\x1b[36m%s\x1b[0m', '===== 开始设置本地开发环境 =====');
  
  // 创建.env.local文件
  const envCreated = createEnvLocalFile();
  if (!envCreated) {
    console.error('环境配置文件创建失败，终止设置');
    process.exit(1);
  }
  
  // 检查MySQL服务
  const mysqlRunning = checkMysqlService();
  if (!mysqlRunning) {
    console.error('MySQL服务检查失败，请启动MySQL后再运行此脚本');
    process.exit(1);
  }
  
  // 初始化数据库
  console.log('初始化数据库...');
  try {
    // 使用我们刚刚创建的环境变量
    process.env.DB_NAME = 'law_exam_assistant';
    
    const dbInitialized = await initializeDatabase();
    if (!dbInitialized) {
      console.error('数据库初始化失败');
      process.exit(1);
    }
    
    // 创建mindmaps表
    console.log('创建知识导图表...');
    const mindmapsSql = fs.readFileSync(path.join(__dirname, './create_mind_maps_table.sql'), 'utf8');
    
    // 直接使用MySQL命令行客户端执行SQL
    const mysqlCmd = `mysql -u${process.env.DB_USER || 'root'} ${process.env.DB_PASSWORD ? `-p${process.env.DB_PASSWORD}` : ''} ${process.env.DB_NAME || 'law_exam_assistant'} -e "${mindmapsSql.replace(/\n/g, ' ')}"`;
    
    try {
      execSync(mysqlCmd);
      console.log('\x1b[32m%s\x1b[0m', '✅ mindmaps表创建成功');
    } catch (error) {
      console.error('创建mindmaps表失败，请手动导入SQL:', error);
      console.log('SQL文件路径:', path.join(__dirname, './create_mind_maps_table.sql'));
    }
    
    console.log('\x1b[32m%s\x1b[0m', '✅ 本地开发环境设置完成！');
    console.log('\x1b[33m%s\x1b[0m', '现在，您可以运行 "npm run dev" 启动项目。');
    
  } catch (error) {
    console.error('设置过程中出错:', error);
    process.exit(1);
  }
}

// 运行设置
setup(); 