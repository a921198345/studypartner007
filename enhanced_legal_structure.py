#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI增强的法律文档处理模块
集成DeepSeek API，提供智能结构识别和分段优化
"""

import re
import json
import requests
import os
from typing import List, Dict, Any, Optional
from text_segmentation import LegalDocumentSegmenter, LegalSegment

class AIEnhancedLegalProcessor:
    """AI增强的法律文档处理器"""
    
    def __init__(self, api_key: str = None):
        self.base_segmenter = LegalDocumentSegmenter()
        self.api_key = api_key or os.getenv('DEEPSEEK_API_KEY')
        self.api_base_url = "https://api.deepseek.com/v1"
        
        if not self.api_key:
            print("⚠️  警告: 未设置DEEPSEEK_API_KEY，AI增强功能将不可用")
    
    def call_deepseek_api(self, prompt: str, model: str = "deepseek-chat") -> str:
        """调用DeepSeek API"""
        if not self.api_key:
            raise ValueError("需要设置DEEPSEEK_API_KEY才能使用AI功能")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,  # 较低温度确保结果一致性
            "max_tokens": 1000
        }
        
        try:
            response = requests.post(
                f"{self.api_base_url}/chat/completions",
                headers=headers,
                json=data,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            return result["choices"][0]["message"]["content"]
            
        except requests.exceptions.RequestException as e:
            print(f"❌ API调用失败: {e}")
            return ""
    
    def ai_enhance_structure_recognition(self, text: str) -> Dict[str, Any]:
        """使用AI增强法律文档结构识别"""
        prompt = f"""
请分析以下法律文档的结构，识别其层次关系：

文档内容：
{text[:2000]}  # 只取前2000字符避免token过多

请返回JSON格式的结构分析，包括：
1. 文档类型（法律、法规、条例等）
2. 主要结构层次（编、章、节、条等）
3. 建议的分段策略
4. 特殊格式说明

返回格式：
{{
    "document_type": "法律文档类型",
    "structure_levels": ["编", "章", "节", "条"],
    "segmentation_strategy": "建议的分段方式",
    "special_formats": ["特殊格式说明"]
}}
"""
        
        try:
            ai_response = self.call_deepseek_api(prompt)
            # 尝试解析JSON响应
            if ai_response:
                # 提取JSON部分
                json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
        except Exception as e:
            print(f"⚠️  AI结构分析失败: {e}")
        
        # 返回默认结构
        return {
            "document_type": "法律文档",
            "structure_levels": ["编", "章", "节", "条"],
            "segmentation_strategy": "按条文分段",
            "special_formats": []
        }
    
    def ai_optimize_segmentation(self, segments: List[LegalSegment]) -> List[LegalSegment]:
        """使用AI优化分段质量"""
        if not self.api_key:
            print("⚠️  跳过AI优化（需要API密钥）")
            return segments
        
        optimized_segments = []
        
        for segment in segments:
            # 对每个分段进行质量检查
            if len(segment.content) > 100:  # 只对较长的分段进行优化
                optimized_segment = self._optimize_single_segment(segment)
                optimized_segments.append(optimized_segment)
            else:
                optimized_segments.append(segment)
        
        return optimized_segments
    
    def _optimize_single_segment(self, segment: LegalSegment) -> LegalSegment:
        """优化单个分段"""
        prompt = f"""
请分析以下法律条文分段，检查其是否具有语义完整性：

分段内容：
{segment.content}

当前元数据：
- 法律: {segment.law_name}
- 条: {segment.article}
- 章: {segment.chapter}

请回答：
1. 这个分段是否语义完整？
2. 是否需要调整分段边界？
3. 元数据是否准确？

返回格式：
{{
    "is_complete": true/false,
    "suggestions": "改进建议",
    "corrected_metadata": {{"修正的元数据"}}
}}
"""
        
        try:
            ai_response = self.call_deepseek_api(prompt)
            json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
            
            if json_match:
                analysis = json.loads(json_match.group())
                
                # 根据AI建议更新元数据
                if "corrected_metadata" in analysis:
                    corrected = analysis["corrected_metadata"]
                    if corrected.get("article"):
                        segment.article = corrected["article"]
                    if corrected.get("chapter"):
                        segment.chapter = corrected["chapter"]
                
        except Exception as e:
            print(f"⚠️  分段优化失败: {e}")
        
        return segment
    
    def extract_key_concepts(self, segment: LegalSegment) -> List[str]:
        """提取分段中的关键法律概念"""
        if not self.api_key:
            return []
        
        prompt = f"""
请从以下法律条文中提取关键的法律概念和术语：

条文内容：
{segment.content}

请返回JSON格式的关键概念列表：
{{"concepts": ["概念1", "概念2", "概念3"]}}
"""
        
        try:
            ai_response = self.call_deepseek_api(prompt)
            json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
            
            if json_match:
                result = json.loads(json_match.group())
                return result.get("concepts", [])
                
        except Exception as e:
            print(f"⚠️  概念提取失败: {e}")
        
        return []
    
    def generate_embeddings(self, segments: List[LegalSegment]) -> List[Dict[str, Any]]:
        """为分段生成向量嵌入（模拟）"""
        results = []
        
        for segment in segments:
            # 实际项目中这里会调用DeepSeek的embedding API
            # 现在我们模拟返回结构
            
            # 提取关键概念
            key_concepts = self.extract_key_concepts(segment)
            
            result = {
                "segment_id": f"{segment.law_name}_{segment.article}",
                "content": segment.content,
                "metadata": segment.to_dict()["metadata"],
                "key_concepts": key_concepts,
                "embedding": [0.1] * 512,  # 模拟512维向量
                "embedding_model": "deepseek-embedding",
                "token_count": segment.token_count
            }
            
            results.append(result)
        
        return results
    
    def process_legal_document(
        self, 
        text: str, 
        law_name: str,
        use_ai_enhancement: bool = True
    ) -> Dict[str, Any]:
        """完整的法律文档处理流程"""
        
        print(f"🚀 开始处理法律文档: {law_name}")
        
        # 1. AI结构分析（可选）
        structure_analysis = None
        if use_ai_enhancement and self.api_key:
            print("🤖 正在进行AI结构分析...")
            structure_analysis = self.ai_enhance_structure_recognition(text)
            print(f"✅ 结构分析完成: {structure_analysis['document_type']}")
        
        # 2. 基础分段
        print("📝 正在进行基础分段...")
        segments = self.base_segmenter.segment_by_legal_structure(text, law_name)
        print(f"✅ 基础分段完成，共 {len(segments)} 个分段")
        
        # 3. AI优化分段（可选）
        if use_ai_enhancement and self.api_key:
            print("🔧 正在进行AI分段优化...")
            segments = self.ai_optimize_segmentation(segments)
            print("✅ 分段优化完成")
        
        # 4. 生成向量嵌入
        print("⚡ 正在生成向量嵌入...")
        embeddings = self.generate_embeddings(segments)
        print(f"✅ 向量生成完成，共 {len(embeddings)} 个向量")
        
        # 5. 返回完整结果
        result = {
            "law_name": law_name,
            "structure_analysis": structure_analysis,
            "segments": [segment.to_dict() for segment in segments],
            "embeddings": embeddings,
            "statistics": {
                "total_segments": len(segments),
                "total_tokens": sum(segment.token_count for segment in segments),
                "avg_tokens_per_segment": sum(segment.token_count for segment in segments) / len(segments) if segments else 0
            }
        }
        
        print("🎉 文档处理完成！")
        return result

def main():
    """演示AI增强功能"""
    print("🤖 AI增强法律文档处理演示")
    print("=" * 60)
    
    # 示例文档
    sample_text = """
中华人民共和国合同法

第一章 一般规定

第一条 为了保护合同当事人的合法权益，维护社会经济秩序，促进社会主义现代化建设，制定本法。

第二条 本法所称合同是平等主体的自然人、法人、其他组织之间设立、变更、终止民事权利义务关系的协议。
婚姻、收养、监护等有关身份关系的协议，适用其他法律的规定。

第三条 合同当事人的法律地位平等，一方不得将自己的意志强加给另一方。

第四条 当事人依法享有自愿订立合同的权利，任何单位和个人不得非法干预。
"""
    
    # 创建AI增强处理器（注意：需要设置DEEPSEEK_API_KEY环境变量）
    processor = AIEnhancedLegalProcessor()
    
    # 处理文档
    result = processor.process_legal_document(
        sample_text, 
        "中华人民共和国合同法",
        use_ai_enhancement=False  # 设为False避免API调用
    )
    
    # 显示结果
    print("\n📊 处理结果统计:")
    stats = result["statistics"]
    print(f"📋 总分段数: {stats['total_segments']}")
    print(f"⚡ 总Token数: {stats['total_tokens']}")
    print(f"📊 平均Token数: {stats['avg_tokens_per_segment']:.1f}")
    
    print("\n📝 分段预览:")
    for i, segment_data in enumerate(result["segments"][:3], 1):
        metadata = segment_data["metadata"]
        content_preview = segment_data["content"][:100] + "..."
        print(f"\n{i}. 📍 {metadata['law_name']} > {metadata['chapter']} > 第{metadata['article']}条")
        print(f"   💬 {content_preview}")

if __name__ == "__main__":
    main() 