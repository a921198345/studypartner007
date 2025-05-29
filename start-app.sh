#!/bin/bash

# 日志函数
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 检查Redis是否在运行
check_redis() {
  log "检查Redis服务状态..."
  redis_running=$(ps aux | grep "[r]edis-server" | wc -l)
  
  if [ $redis_running -eq 0 ]; then
    log "Redis未运行，正在启动..."
    redis-server --daemonize yes
    sleep 2
    
    # 验证Redis是否成功启动
    if [ $(ps aux | grep "[r]edis-server" | wc -l) -gt 0 ]; then
      log "✅ Redis服务器已成功启动"
    else
      log "❌ Redis服务器启动失败"
      return 1
    fi
  else
    log "✅ Redis服务器已在运行"
  fi
  
  # 检查Redis连接
  if redis-cli ping > /dev/null 2>&1; then
    log "✅ Redis连接正常"
    return 0
  else
    log "❌ Redis连接失败，尝试重启Redis..."
    redis-cli shutdown > /dev/null 2>&1
    sleep 2
    redis-server --daemonize yes
    sleep 2
    
    if redis-cli ping > /dev/null 2>&1; then
      log "✅ Redis重启后连接正常"
      return 0
    else
      log "❌ Redis仍然无法连接，请检查配置"
      return 1
    fi
  fi
}

# 启动应用
start_app() {
  log "启动法律考试助手应用..."
  npm run dev
}

# 主流程
main() {
  log "=== 法律考试助手启动程序 ==="
  
  # 检查并启动Redis
  if check_redis; then
    start_app
  else
    log "❌ 由于Redis问题，应用无法启动"
    exit 1
  fi
}

# 执行主流程
main 