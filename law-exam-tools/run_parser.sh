   #!/bin/bash
   
   # 检查参数
   if [ $# -lt 2 ]; then
       echo "用法: ./run_parser.sh <word文档路径> <学科名称>"
       echo "例如: ./run_parser.sh 民法题库.docx 民法"
       exit 1
   fi
   
   DOC_PATH="$1"
   SUBJECT="$2"
   
   # 检查文件是否存在
   if [ ! -f "$DOC_PATH" ]; then
       echo "错误: 文件 '$DOC_PATH' 不存在"
       exit 1
   fi
   
   # 检查Python环境
   if ! command -v python3 &> /dev/null; then
       echo "错误: 找不到python3，请先安装"
       exit 1
   fi
   
   # 检查必要的库
   python3 -c "import docx" &> /dev/null || {
       echo "正在安装必要的库..."
       pip install python-docx
   }
   
   python3 -c "import mysql.connector" &> /dev/null || {
       echo "正在安装必要的库..."
       pip install mysql-connector-python
   }
   
   # 运行解析脚本
   echo "开始解析文件..."
   python3 parse_questions.py "$DOC_PATH" "$SUBJECT"
