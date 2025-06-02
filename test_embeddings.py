#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
测试向量化模块的功能
"""

import os
import sys
from lib.embeddings import get_embeddings_from_deepseek

def main():
    """
    主函数：测试向量化功能
    """
    # 检查是否提供API密钥
    api_key = os.getenv('DEEPSEEK_API_KEY')
    if not api_key and len(sys.argv) < 2:
        print("请提供DeepSeek API密钥作为命令行参数，或设置DEEPSEEK_API_KEY环境变量")
        print("用法: python test_embeddings.py [API_KEY]")
        return
    
    # 如果通过命令行提供了API密钥，使用命令行参数
    if len(sys.argv) >= 2:
        api_key = sys.argv[1]
        print("使用命令行提供的API密钥")
    else:
        print("使用环境变量中的API密钥")
    
    # 测试文本
    test_chunks = [
        "合同法是规范平等主体的自然人、法人和其他组织之间设立、变更、终止民事权利义务关系的协议的法律规范。",
        "物权是权利人依法对特定物享有直接支配和排他的权利，包括所有权、用益物权和担保物权。"
    ]
    
    print(f"开始向量化 {len(test_chunks)} 个文本块...")
    
    # 获取向量
    results = get_embeddings_from_deepseek(test_chunks, api_key=api_key)
    
    # 检查结果
    successful = sum(1 for item in results if item['embedding'] is not None)
    
    # 如果所有文本都成功向量化，输出详细信息
    if successful == len(test_chunks):
        print("\n向量化成功！详细结果:")
        for i, result in enumerate(results):
            vector = result['embedding']
            vector_len = len(vector)
            # 只显示向量的前3个和后3个元素
            vector_preview = f"{vector[:3]}...{vector[-3:]}"
            print(f"文本 {i+1}: 向量维度 = {vector_len}")
            print(f"文本内容: {result['text'][:50]}...")
            print(f"向量预览: {vector_preview}")
            print("-" * 50)
    else:
        print("\n部分文本向量化失败。详细结果:")
        for i, result in enumerate(results):
            if result['embedding'] is not None:
                print(f"文本 {i+1}: 向量化成功，维度 = {len(result['embedding'])}")
            else:
                print(f"文本 {i+1}: 向量化失败 - {result.get('error', '未知错误')}")

if __name__ == "__main__":
    main() 