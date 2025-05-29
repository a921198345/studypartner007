#!/bin/bash

# 获取当前目录的绝对路径
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 检测用户使用的shell
USER_SHELL=$(basename "$SHELL")

# 要添加的别名
ALIAS_LINE="alias start-law-exam='cd $APP_DIR && ./start-app.sh'"

# 根据shell类型选择配置文件
if [ "$USER_SHELL" = "zsh" ]; then
  CONFIG_FILE="$HOME/.zshrc"
elif [ "$USER_SHELL" = "bash" ]; then
  CONFIG_FILE="$HOME/.bashrc"
  # 如果是Mac上的bash，可能使用.bash_profile
  if [ -f "$HOME/.bash_profile" ]; then
    CONFIG_FILE="$HOME/.bash_profile"
  fi
else
  echo "不支持的shell: $USER_SHELL"
  exit 1
fi

# 检查别名是否已存在
if grep -q "alias start-law-exam=" "$CONFIG_FILE"; then
  echo "别名 'start-law-exam' 已存在于 $CONFIG_FILE 中"
else
  # 添加别名到配置文件
  echo "" >> "$CONFIG_FILE"
  echo "# 法律考试助手启动别名" >> "$CONFIG_FILE"
  echo "$ALIAS_LINE" >> "$CONFIG_FILE"
  echo "别名 'start-law-exam' 已添加到 $CONFIG_FILE"
  echo "请运行 'source $CONFIG_FILE' 或重新打开终端使别名生效"
fi

# 赋予启动脚本执行权限
chmod +x "$APP_DIR/start-app.sh"
echo "start-app.sh 已设置为可执行文件"

echo ""
echo "设置完成！现在你可以使用以下命令启动应用："
echo "start-law-exam" 