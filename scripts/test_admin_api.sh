#!/bin/bash
# 测试管理员API的脚本

# 测试 API 服务是否正常运行
echo "测试 API 服务是否运行..."
curl -s http://127.0.0.1:5002/

# 测试上传 OPML 文件
echo -e "\n\n测试上传 OPML 文件..."
curl -X POST -F "file=@民法.opml" -F "subject_name=民法" http://127.0.0.1:5002/admin/upload-opml

# 测试获取学科列表
echo -e "\n\n测试获取学科列表..."
curl -s http://127.0.0.1:5002/api/mindmaps/list

# 测试获取特定学科的知识导图
echo -e "\n\n测试获取民法知识导图..."
curl -s http://127.0.0.1:5002/api/mindmaps/民法 