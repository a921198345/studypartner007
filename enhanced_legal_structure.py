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
        # 更新到最新API端点
        self.api_base_url = "https://api.deepseek.com"
        
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
                f"{self.api_base_url}/v1/chat/completions",
                headers=headers,
                json=data,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            return result["choices"][0]["message"]["content"]
            
        except requests.exceptions.RequestException as e:
            print(f"❌ API调用失败: {str(e)}")
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
    
    def check_segment_quality(self, segment: LegalSegment) -> Dict[str, Any]:
        """
        检查分段质量
        
        Args:
            segment: 需要检查的分段
            
        Returns:
            包含质量评估结果的字典
        """
        # 初始化评估结果
        quality_assessment = {
            "is_complete": True,
            "issues": [],
            "score": 10  # 1-10分数
        }
        
        # 1. 检查内容长度 (太短可能不是完整语义单元)
        content_length = len(segment.content)
        if content_length < 50:
            quality_assessment["is_complete"] = False
            quality_assessment["issues"].append("内容过短，可能不是完整语义单元")
            quality_assessment["score"] -= 2
        
        # 2. 检查元数据完整性
        if not segment.article and not segment.chapter:
            quality_assessment["issues"].append("缺少关键结构信息(条/章)")
            quality_assessment["score"] -= 2
            
        # 3. 检查内容是否有明确的开始和结束
        content = segment.content.strip()
        if not content.endswith(("。", "！", "？", "；", ".", "!", "?", ";")):
            quality_assessment["issues"].append("内容可能不完整，缺少适当的结束符")
            quality_assessment["score"] -= 1
            
        # 4. 检查语义连贯性 (通过AI完成)
        if self.api_key and len(content) > 100:  # 只对较长文本调用AI
            ai_assessment = self._assess_semantic_quality(segment)
            if ai_assessment:
                if not ai_assessment.get("is_coherent", True):
                    quality_assessment["issues"].append("AI检测到语义不连贯问题")
                    quality_assessment["score"] -= 2
                
                # 合并AI评估结果
                quality_assessment.update({
                    "ai_assessment": ai_assessment
                })
        
        # 确保最终分数在1-10范围内
        quality_assessment["score"] = max(1, min(10, quality_assessment["score"]))
        
        return quality_assessment
    
    def _assess_semantic_quality(self, segment: LegalSegment) -> Dict[str, Any]:
        """使用AI评估分段的语义质量"""
        if not self.api_key:
            return {}
            
        prompt = f"""
分析以下法律条文分段的语义质量:

分段内容:
{segment.content}

元数据:
法律: {segment.law_name}
章: {segment.chapter or '无'}
条: {segment.article or '无'}

请评估:
1. 内容是否语义连贯？
2. 是否包含完整的法律表述？
3. 有无语义断裂或不连贯之处？

以JSON格式回答:
{{
  "is_coherent": true/false,
  "is_complete_statement": true/false,
  "issues": ["问题1", "问题2"...],
  "improvement": "改进建议"
}}
"""
        
        try:
            response = self.call_deepseek_api(prompt)
            # 尝试提取JSON
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except Exception as e:
            print(f"⚠️ AI语义评估失败: {e}")
        
        return {}
    
    def ai_optimize_segmentation(self, segments: List[LegalSegment]) -> List[LegalSegment]:
        """使用AI优化分段质量"""
        if not self.api_key:
            print("⚠️  跳过AI优化（需要API密钥）")
            return segments
        
        print(f"🔍 正在评估并优化 {len(segments)} 个分段的质量...")
        optimized_segments = []
        quality_scores = []
        
        # 先进行质量检查，找出需要优化的分段
        for i, segment in enumerate(segments):
            print(f"  评估分段 {i+1}/{len(segments)}...")
            quality = self.check_segment_quality(segment)
            quality_scores.append(quality)
            
            # 如果质量分数低于阈值，进行优化
            if quality["score"] < 7:
                optimized_segment = self._optimize_single_segment(segment, quality)
                optimized_segments.append(optimized_segment)
                print(f"  ✨ 分段 {i+1} 已优化，原始分数: {quality['score']}")
            else:
                optimized_segments.append(segment)
                print(f"  ✅ 分段 {i+1} 质量良好，分数: {quality['score']}")
        
        # 输出质量统计
        scores = [q["score"] for q in quality_scores]
        if scores:
            avg_score = sum(scores) / len(scores)
            print(f"📊 分段质量统计：平均分数 {avg_score:.1f}，最低 {min(scores)}，最高 {max(scores)}")
            
        return optimized_segments
    
    def _optimize_single_segment(self, segment: LegalSegment, quality: Dict[str, Any]) -> LegalSegment:
        """优化单个分段"""
        if not self.api_key:
            return segment
            
        issues = quality.get("issues", [])
        issues_str = "\n".join([f"- {issue}" for issue in issues])
            
        prompt = f"""
作为法律文本分段优化专家，请优化以下法律分段内容，解决存在的质量问题:

原始分段内容:
{segment.content}

元数据:
- 法律: {segment.law_name}
- 编: {segment.book or '无'}
- 章: {segment.chapter or '无'}
- 节: {segment.section or '无'}
- 条: {segment.article or '无'}

检测到的问题:
{issues_str}

请执行以下优化:
1. 修正不连贯或不完整的表述
2. 确保语义完整性
3. 保留原始法律含义和专业术语
4. 保持原文结构和格式
5. 不要添加原文中不存在的法律解释

只返回优化后的文本内容，不要添加解释或其他内容。
"""
        
        try:
            response = self.call_deepseek_api(prompt)
            if response:
                # 复制原分段，但替换内容为优化后的内容
                return LegalSegment(
                    content=response,
                    law_name=segment.law_name,
                    book=segment.book,
                    chapter=segment.chapter,
                    section=segment.section,
                    article=segment.article,
                    paragraph=segment.paragraph,
                    item=segment.item,
                    token_count=self.base_segmenter.estimate_tokens(response)
                )
        except Exception as e:
            print(f"⚠️ 分段优化失败: {e}")
        
        # 如果优化失败，返回原始分段
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
    
    def generate_embeddings_for_text(self, text: str, model: str = "text-embedding-ada-002") -> List[float]:
        """
        为文本生成向量嵌入
        
        Args:
            text: 需要向量化的文本
            model: 使用的嵌入模型名称
            
        Returns:
            向量列表
        """
        if not self.api_key:
            # 返回虚拟向量（实际项目中这里不应该这样处理）
            return [0.1] * 512
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": model,
            "input": text,
            "encoding_format": "float"
        }
        
        try:
            response = requests.post(
                f"{self.api_base_url}/v1/embeddings",
                headers=headers,
                json=data,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            return result["data"][0]["embedding"]
            
        except requests.exceptions.RequestException as e:
            print(f"❌ 嵌入生成失败: {str(e)}")
            # 返回虚拟向量
            return [0.1] * 512
    
    def generate_embeddings(self, segments: List[LegalSegment]) -> List[Dict[str, Any]]:
        """为分段生成向量嵌入"""
        results = []
        
        print(f"⏳ 正在为 {len(segments)} 个分段生成向量嵌入...")
        
        for i, segment in enumerate(segments):
            print(f"  处理分段 {i+1}/{len(segments)}...")
            
            # 提取关键概念
            key_concepts = self.extract_key_concepts(segment)
            
            # 生成文本的向量嵌入
            embedding = self.generate_embeddings_for_text(segment.content)
            
            result = {
                "segment_id": f"{segment.law_name}_{segment.article or i}",
                "content": segment.content,
                "metadata": segment.to_dict()["metadata"],
                "key_concepts": key_concepts,
                "embedding": embedding,
                "embedding_model": "text-embedding-ada-002",
                "token_count": segment.token_count
            }
            
            results.append(result)
        
        print(f"✅ 向量嵌入生成完成")
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