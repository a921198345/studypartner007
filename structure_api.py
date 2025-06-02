#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
法律结构识别 API 模块
提供法律文本结构化处理的HTTP接口
"""

from flask import Flask, request, jsonify
import os
import json
import traceback
from flask_cors import CORS

# 导入结构识别模块
try:
    from legal_structure_recognition import segment_with_structure
    STRUCTURE_RECOGNITION_AVAILABLE = True
    print("成功导入法律结构识别模块")
except ImportError as e:
    STRUCTURE_RECOGNITION_AVAILABLE = False
    print(f"无法导入法律结构识别模块: {str(e)}")
    
    # 创建一个简单的占位函数
    def segment_with_structure(text):
        raise Exception("法律结构识别模块未正确加载，无法处理结构识别")

# 导入文本提取函数
try:
    from parse_docx import extract_text_from_word
    DOCX_PARSER_AVAILABLE = True
    print("成功导入 extract_text_from_word 函数")
except ImportError as e:
    DOCX_PARSER_AVAILABLE = False
    print(f"无法导入 extract_text_from_word 函数: {str(e)}")
    
    # 创建一个简单的占位函数
    def extract_text_from_word(file_path):
        raise Exception("文本提取模块未正确加载，无法处理Word文档")

app = Flask(__name__)
# 配置CORS，允许所有来源，包括null来源
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

@app.route('/')
def index():
    """返回API服务状态和可用端点信息"""
    return jsonify({
        'status': 'online',
        'version': '1.0.0',
        'api': 'legal_structure_recognition',
        'endpoints': {
            '/process_text': 'POST - 处理文本并返回结构化结果',
            '/process_file': 'POST - 处理上传的文件并返回结构化结果',
            '/health': 'GET - 返回服务健康状态'
        },
        'modules': {
            'structure_recognition': STRUCTURE_RECOGNITION_AVAILABLE,
            'docx_parser': DOCX_PARSER_AVAILABLE
        }
    })

@app.route('/health')
def health_check():
    """健康检查端点"""
    return jsonify({
        'status': 'healthy',
        'modules': {
            'structure_recognition': STRUCTURE_RECOGNITION_AVAILABLE,
            'docx_parser': DOCX_PARSER_AVAILABLE
        }
    })

@app.route('/process_text', methods=['POST'])
def process_text():
    """
    处理提交的文本，进行法律结构分析
    
    请求参数 (JSON):
        text: 要处理的文本内容
        include_metadata: 是否在响应中包含详细元数据 (默认: true)
        include_navigation: 是否在响应中包含导航信息 (默认: true)
    
    返回:
        结构化的文本分段结果，包含元数据
    """
    if not STRUCTURE_RECOGNITION_AVAILABLE:
        return jsonify({
            'success': False,
            'message': '法律结构识别模块未正确加载，无法处理结构识别',
            'segments': []
        }), 500
    
    try:
        # 获取请求参数
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': '请求缺少必要的JSON数据',
                'segments': []
            }), 400
        
        text = data.get('text', '')
        include_metadata = data.get('include_metadata', True)
        include_navigation = data.get('include_navigation', True)
        
        if not text:
            return jsonify({
                'success': False,
                'message': '未提供文本内容',
                'segments': []
            }), 400
        
        # 进行结构识别
        segments = segment_with_structure(text)
        
        # 根据参数过滤结果
        filtered_segments = []
        for segment in segments:
            filtered_segment = {
                'content': segment['content'],
                'metadata': {}
            }
            
            # 如果包含元数据，添加所有元数据
            if include_metadata:
                filtered_segment['metadata'] = segment['metadata']
            else:
                # 仅添加基础元数据
                filtered_segment['metadata'] = {
                    'structure_type': segment['metadata']['structure_type'],
                    'index': segment['metadata']['index']
                }
            
            # 如果不包含导航信息，移除相关字段
            if not include_navigation and 'metadata' in filtered_segment:
                metadata = filtered_segment['metadata']
                if 'prev_index' in metadata:
                    del metadata['prev_index']
                if 'next_index' in metadata:
                    del metadata['next_index']
            
            filtered_segments.append(filtered_segment)
        
        # 准备分类统计信息
        structure_types = {}
        for segment in segments:
            structure_type = segment['metadata']['structure_type']
            structure_types[structure_type] = structure_types.get(structure_type, 0) + 1
        
        return jsonify({
            'success': True,
            'message': f'文本已成功处理并识别结构',
            'segments': filtered_segments,
            'total_segments': len(segments),
            'statistics': {
                'structure_types': structure_types
            }
        })
        
    except Exception as e:
        error_message = f"处理文本时出错: {str(e)}"
        print(error_message)
        print(traceback.format_exc())
        
        return jsonify({
            'success': False,
            'message': error_message,
            'segments': []
        }), 500

@app.route('/process_file', methods=['POST'])
def process_file():
    """
    处理上传的文件，提取文本并进行法律结构分析
    
    请求参数 (表单):
        file: 要处理的文件 (支持 .txt, .docx, .doc)
        include_metadata: 是否在响应中包含详细元数据 (默认: true)
        include_navigation: 是否在响应中包含导航信息 (默认: true)
    
    返回:
        结构化的文本分段结果，包含元数据
    """
    if not STRUCTURE_RECOGNITION_AVAILABLE:
        return jsonify({
            'success': False,
            'message': '法律结构识别模块未正确加载，无法处理结构识别',
            'segments': []
        }), 500
    
    try:
        # 检查是否有文件上传
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'message': '未找到上传的文件',
                'segments': []
            }), 400
        
        file = request.files['file']
        
        # 检查文件名是否为空
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': '未选择文件',
                'segments': []
            }), 400
        
        # 获取其他参数
        include_metadata = request.form.get('include_metadata', 'true').lower() == 'true'
        include_navigation = request.form.get('include_navigation', 'true').lower() == 'true'
        
        # 提取文本内容
        text = ""
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext in ['.docx', '.doc']:
            if not DOCX_PARSER_AVAILABLE:
                return jsonify({
                    'success': False,
                    'message': '文本提取模块未正确加载，无法处理Word文档',
                    'segments': []
                }), 500
            
            # 保存临时文件
            temp_dir = "temp_uploads"
            os.makedirs(temp_dir, exist_ok=True)
            temp_path = os.path.join(temp_dir, file.filename)
            file.save(temp_path)
            
            try:
                # 提取文本
                text = extract_text_from_word(temp_path)
                
                # 处理完毕后删除临时文件
                os.remove(temp_path)
            except Exception as e:
                return jsonify({
                    'success': False,
                    'message': f'提取Word文档文本时出错: {str(e)}',
                    'segments': []
                }), 500
        elif file_ext == '.txt':
            # 直接读取文本文件
            text = file.read().decode('utf-8')
        else:
            return jsonify({
                'success': False,
                'message': f'不支持的文件类型: {file_ext}，请上传 .txt, .docx 或 .doc 文件',
                'segments': []
            }), 400
        
        if not text:
            return jsonify({
                'success': False,
                'message': '提取的文本内容为空',
                'segments': []
            }), 400
        
        # 进行结构识别
        segments = segment_with_structure(text)
        
        # 根据参数过滤结果
        filtered_segments = []
        for segment in segments:
            filtered_segment = {
                'content': segment['content'],
                'metadata': {}
            }
            
            # 如果包含元数据，添加所有元数据
            if include_metadata:
                filtered_segment['metadata'] = segment['metadata']
            else:
                # 仅添加基础元数据
                filtered_segment['metadata'] = {
                    'structure_type': segment['metadata']['structure_type'],
                    'index': segment['metadata']['index']
                }
            
            # 如果不包含导航信息，移除相关字段
            if not include_navigation and 'metadata' in filtered_segment:
                metadata = filtered_segment['metadata']
                if 'prev_index' in metadata:
                    del metadata['prev_index']
                if 'next_index' in metadata:
                    del metadata['next_index']
            
            filtered_segments.append(filtered_segment)
        
        # 准备分类统计信息
        structure_types = {}
        for segment in segments:
            structure_type = segment['metadata']['structure_type']
            structure_types[structure_type] = structure_types.get(structure_type, 0) + 1
        
        return jsonify({
            'success': True,
            'message': f'文件 {file.filename} 已成功处理并识别结构',
            'filename': file.filename,
            'segments': filtered_segments,
            'total_segments': len(segments),
            'statistics': {
                'structure_types': structure_types
            }
        })
        
    except Exception as e:
        error_message = f"处理文件时出错: {str(e)}"
        print(error_message)
        print(traceback.format_exc())
        
        return jsonify({
            'success': False,
            'message': error_message,
            'segments': []
        }), 500

if __name__ == '__main__':
    # 设置临时上传目录
    temp_dir = "temp_uploads"
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
    
    # 打印启动信息
    print("--- 法律结构识别 API 服务启动 ---")
    print(f"结构识别模块: {'可用' if STRUCTURE_RECOGNITION_AVAILABLE else '不可用'}")
    print(f"文档解析模块: {'可用' if DOCX_PARSER_AVAILABLE else '不可用'}")
    print("正在启动服务...")
    
    # 启动服务
    app.run(host='0.0.0.0', port=5004, debug=True) 