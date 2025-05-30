#!/bin/bash

# 日志函数
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 尝试不同方式启动Redis
start_redis() {
  log "尝试启动Redis..."
  
  # 方法1: 直接使用redis-server
  if command -v redis-server > /dev/null 2>&1; then
    log "尝试方法1: 直接启动Redis服务器"
    redis-server --daemonize yes
    sleep 2
    return 0
  fi
  
  # 方法2: 使用Homebrew services (如果可用)
  if command -v brew > /dev/null 2>&1; then
    log "尝试方法2: 使用Homebrew服务启动Redis"
    brew services start redis > /dev/null 2>&1
    sleep 2
    return 0
  fi
  
  # 方法3: 尝试找到Redis可执行文件
  REDIS_PATH=$(which redis-server 2>/dev/null)
  if [ -n "$REDIS_PATH" ]; then
    log "尝试方法3: 使用完整路径启动Redis - $REDIS_PATH"
    "$REDIS_PATH" --daemonize yes
    sleep 2
    return 0
  fi
  
  log "无法找到可用的Redis启动方法"
  return 1
}

# 检查Redis是否在运行
check_redis() {
  log "检查Redis服务状态..."
  redis_running=$(ps aux | grep "[r]edis-server" | wc -l)
  
  if [ $redis_running -eq 0 ]; then
    log "Redis未运行，正在启动..."
    start_redis
    
    # 验证Redis是否成功启动
    if [ $(ps aux | grep "[r]edis-server" | wc -l) -gt 0 ]; then
      log "✅ Redis服务器已成功启动"
    else
      log "⚠️ Redis服务器启动失败，应用可能无法使用部分功能"
      return 0  # 即使Redis启动失败也继续运行应用
    fi
  else
    log "✅ Redis服务器已在运行"
  fi
  
  # 检查Redis连接
  if redis-cli ping > /dev/null 2>&1; then
    log "✅ Redis连接正常"
    return 0
  else
    log "⚠️ Redis连接失败，尝试重启Redis..."
    redis-cli shutdown > /dev/null 2>&1 || true
    sleep 2
    start_redis
    sleep 2
    
    if redis-cli ping > /dev/null 2>&1; then
      log "✅ Redis重启后连接正常"
      return 0
    else
      log "⚠️ Redis仍然无法连接，应用将以有限功能运行"
      return 0  # 即使Redis连接失败也继续运行应用
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
  check_redis
  # 无论Redis是否启动成功，都继续运行应用
  start_app
}

# 执行主流程
main 