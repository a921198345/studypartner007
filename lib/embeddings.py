#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
向量化模块 (embeddings.py)
用于调用DeepSeek API将文本转换为向量嵌入
"""

import os
import time
import json
import requests
from typing import List, Dict, Union, Any

# 尝试导入dotenv，如果不存在则提供警告
try:
    from dotenv import load_dotenv
    # 加载环境变量
    load_dotenv()
    print("成功从.env文件加载环境变量")
except ImportError:
    print("警告: python-dotenv库未安装，将仅从系统环境变量获取配置")

class DeepSeekEmbeddings:
    """DeepSeek API 向量化工具类"""
    
    def __init__(self, api_key=None):
        """
        初始化DeepSeek API配置
        
        参数:
            api_key: 可选的API密钥，如果不提供则尝试从环境变量获取
        """
        # 获取API密钥，优先使用参数提供的，其次从环境变量读取
        self.api_key = api_key or os.getenv('DEEPSEEK_API_KEY')
        if not self.api_key:
            raise ValueError("未找到DeepSeek API密钥，请通过参数传入或设置DEEPSEEK_API_KEY环境变量")
            
        # API配置
        self.api_url = "https://api.deepseek.com/v1/embeddings"  # DeepSeek的Embedding API地址
        self.model = "deepseek-embed"  # 使用的模型名称
        self.max_retries = 3  # 最大重试次数
        self.retry_delay = 2  # 重试间隔(秒)
        
    def get_embeddings(self, texts: List[str]) -> List[Dict[str, Any]]:
        """
        获取文本列表的向量嵌入
        
        参数:
            texts: 要向量化的文本块列表
            
        返回:
            包含向量和元数据的字典列表
        """
        results = []
        
        for i, text in enumerate(texts):
            # 对每个文本块单独处理
            try:
                vector = self._call_api_with_retry(text)
                results.append({
                    'text': text,
                    'embedding': vector,
                    'index': i
                })
                print(f"成功向量化文本块 {i+1}/{len(texts)}")
            except Exception as e:
                print(f"向量化文本块 {i+1}/{len(texts)} 失败: {str(e)}")
                # 将失败的项添加到结果中，但embedding为None
                results.append({
                    'text': text,
                    'embedding': None,
                    'index': i,
                    'error': str(e)
                })
        
        return results
    
    def _call_api_with_retry(self, text: str) -> List[float]:
        """
        调用DeepSeek API获取文本向量，包含重试机制
        
        参数:
            text: 要向量化的文本
            
        返回:
            文本的向量表示
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "input": text
        }
        
        retries = 0
        while retries < self.max_retries:
            try:
                response = requests.post(
                    self.api_url,
                    headers=headers,
                    data=json.dumps(payload),
                    timeout=30  # 30秒超时
                )
                
                # 检查响应状态
                if response.status_code == 200:
                    # 成功获取响应
                    data = response.json()
                    return data.get('data', [{}])[0].get('embedding', [])
                elif response.status_code == 429:
                    # 速率限制，等待后重试
                    print(f"API速率限制，等待重试... ({retries+1}/{self.max_retries})")
                    time.sleep(self.retry_delay * (retries + 1))  # 指数退避
                else:
                    # 其他HTTP错误
                    error_msg = f"API请求失败: HTTP {response.status_code}, {response.text}"
                    print(error_msg)
                    raise Exception(error_msg)
                    
            except requests.exceptions.RequestException as e:
                # 网络错误
                print(f"网络错误: {str(e)}, 重试中... ({retries+1}/{self.max_retries})")
            
            retries += 1
            time.sleep(self.retry_delay)
        
        # 所有重试都失败
        raise Exception(f"经过 {self.max_retries} 次重试后仍无法获取向量嵌入")

def get_embeddings_from_deepseek(text_chunks: List[str], api_key=None) -> List[Dict[str, Any]]:
    """
    将文本块列表转换为向量嵌入
    
    参数:
        text_chunks: 要向量化的文本块列表
        api_key: 可选的DeepSeek API密钥，如果不提供则尝试从环境变量获取
        
    返回:
        包含原文本、向量和索引的字典列表
    """
    try:
        # 初始化DeepSeek嵌入工具
        embedder = DeepSeekEmbeddings(api_key=api_key)
        
        # 获取所有文本块的向量
        results = embedder.get_embeddings(text_chunks)
        
        # 处理结果
        successful = sum(1 for item in results if item['embedding'] is not None)
        failed = len(results) - successful
        
        print(f"向量化完成: 共 {len(results)} 个文本块, 成功 {successful} 个, 失败 {failed} 个")
        
        return results
    
    except Exception as e:
        print(f"向量化过程中发生错误: {str(e)}")
        # 返回空结果
        return [{'text': chunk, 'embedding': None, 'index': i, 'error': str(e)} 
                for i, chunk in enumerate(text_chunks)]

# 测试函数
if __name__ == "__main__":
    # 测试文本
    test_chunks = [
        "合同法是规范平等主体的自然人、法人和其他组织之间设立、变更、终止民事权利义务关系的协议的法律规范。",
        "物权是权利人依法对特定物享有直接支配和排他的权利，包括所有权、用益物权和担保物权。"
    ]
    
    # 从命令行获取API密钥（如果有）
    import sys
    api_key = sys.argv[1] if len(sys.argv) > 1 else None
    
    # 获取向量
    results = get_embeddings_from_deepseek(test_chunks, api_key=api_key)
    
    # 打印结果
    for i, result in enumerate(results):
        if result['embedding'] is not None:
            vector_len = len(result['embedding'])
            vector_preview = str(result['embedding'][:3]) + "..." + str(result['embedding'][-3:])
            print(f"文本 {i+1}: 向量维度 = {vector_len}, 预览: {vector_preview}")
        else:
            print(f"文本 {i+1}: 向量化失败 - {result.get('error', '未知错误')}") 