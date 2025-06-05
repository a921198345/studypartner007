#!/usr/bin/env python3
import os
import requests
import sys
import json

def test_deepseek_api():
    """测试DeepSeek API密钥是否有效"""
    print("=== DeepSeek API密钥测试 ===")
    
    # 从环境变量获取API密钥
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    
    if not api_key:
        print("❌ 错误: 未找到DeepSeek API密钥。请设置DEEPSEEK_API_KEY环境变量。")
        print("提示: 可以运行 ./setup_vector_db.sh 来配置API密钥。")
        return False
    
    # 屏蔽部分密钥显示
    masked_key = api_key[:4] + "*" * (len(api_key) - 8) + api_key[-4:] if len(api_key) > 8 else "****"
    print(f"📝 找到API密钥: {masked_key}")
    
    # 测试API连接
    print("🔄 测试API连接...")
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    # DeepSeek API URL - 使用正确的API端点
    url = "https://api.deepseek.com/v1/embeddings"
    
    # 请求参数 - 更新为DeepSeek的模型名称
    payload = {
        "input": "这是一个测试文本，用于验证DeepSeek API密钥。",
        "model": "text-embedding-ada-002"
    }
    
    try:
        # 禁用SSL证书验证以解决证书问题
        response = requests.post(url, headers=headers, json=payload, verify=False)
        response.raise_for_status()
        
        result = response.json()
        embedding = result['data'][0]['embedding']
        
        print(f"✅ API连接成功! 生成的向量维度: {len(embedding)}")
        print(f"📊 向量示例 (前5个值): {embedding[:5]}")
        return True
        
    except Exception as e:
        print(f"❌ API连接失败: {str(e)}")
        if hasattr(e, "response") and e.response:
            print(f"错误响应: {e.response.status_code} - {e.response.text}")
        # 打印更详细的错误信息
        print(f"详细错误: {repr(e)}")
        return False

def main():
    """主函数"""
    print("\n=== 法考助手系统检测工具 ===\n")
    
    # 测试API密钥
    api_key_valid = test_deepseek_api()
    
    print("\n=== 检测结果汇总 ===")
    if api_key_valid:
        print("✅ DeepSeek API密钥有效")
        print("\n您的系统配置正确，可以使用向量搜索功能。")
        print("1. 启动API服务: python admin_api.py")
        print("2. 访问上传界面: http://localhost:5003/easy_upload")
        print("3. 上传并向量化您的法律文档")
        print("4. 使用搜索框测试向量检索功能")
    else:
        print("❌ DeepSeek API密钥无效或未设置")
        print("\n请先解决API密钥问题，然后再尝试使用向量搜索功能。")
        print("运行 ./setup_vector_db.sh 配置有效的DeepSeek API密钥。")
    
    print("\n祝您使用愉快！")

if __name__ == "__main__":
    main() 