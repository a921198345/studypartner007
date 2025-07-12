module.exports = {
  apps: [{
    name: 'lightweight-server',
    script: 'lightweight-server.js',
    cwd: '/www/wwwroot/law-exam-assistant',
    
    // 进程配置
    instances: 1,
    autorestart: true,
    watch: false,
    
    // 内存限制
    max_memory_restart: '80M',
    
    // Node.js 参数
    node_args: [
      '--max-old-space-size=64',
      '--optimize-for-size'
    ],
    
    // 环境变量
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    
    // 日志配置
    log_file: '/www/wwwlogs/lightweight-server.log',
    out_file: '/www/wwwlogs/lightweight-server-out.log',
    error_file: '/www/wwwlogs/lightweight-server-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    
    // 重启策略
    min_uptime: '10s',
    max_restarts: 10,
    
    // 监听退出代码
    listen_timeout: 3000,
    kill_timeout: 5000
  }]
};