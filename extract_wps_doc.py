#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
处理WPS .doc文件的专用工具
"""

import os
import olefile
import struct

def extract_wps_doc_text(doc_path):
    """尝试从WPS .doc文件中提取文本"""
    try:
        # 使用olefile读取复合文档
        if olefile.isOleFile(doc_path):
            with olefile.OleFileIO(doc_path) as ole:
                print("这是一个有效的OLE文件")
                
                # 列出所有流
                print("文档包含的流:")
                for stream in ole.listdir():
                    print(f"  {stream}")
                
                # 尝试读取WordDocument流（包含主要文本）
                if ole._olestream_size['WordDocument'] > 0:
                    print("找到WordDocument流")
                    data = ole._olestream_data['WordDocument']
                    
                    # 尝试解析文档结构
                    # Word文档有复杂的二进制格式，这里做简单尝试
                    text_parts = []
                    
                    # 查找可能的文本数据
                    for i in range(0, len(data), 2):
                        if i + 1 < len(data):
                            # 尝试读取UTF-16字符
                            try:
                                char_code = struct.unpack('<H', data[i:i+2])[0]
                                if 32 <= char_code <= 126 or char_code >= 0x4e00:  # ASCII或中文范围
                                    char = chr(char_code)
                                    text_parts.append(char)
                                elif char_code == 0:
                                    text_parts.append('\n')
                            except:
                                continue
                    
                    extracted_text = ''.join(text_parts)
                    if len(extracted_text) > 100:  # 如果提取到足够的文本
                        return extracted_text
                
                # 尝试其他流
                for stream_name in ['1Table', '0Table', 'Data']:
                    if stream_name in ole._olestream_size:
                        print(f"尝试从 {stream_name} 流提取文本...")
                        # 类似的处理逻辑
                        
        return None
    except Exception as e:
        print(f"提取失败: {e}")
        return None

def try_manual_text_extraction(doc_path):
    """手动尝试提取文本"""
    try:
        with open(doc_path, 'rb') as f:
            data = f.read()
        
        # 查找可能的文本片段
        text_parts = []
        i = 0
        while i < len(data):
            # 查找连续的可读字符
            readable_chars = []
            while i < len(data):
                byte = data[i]
                if 32 <= byte <= 126:  # ASCII可读字符
                    readable_chars.append(chr(byte))
                elif byte == 0:
                    readable_chars.append(' ')
                else:
                    break
                i += 1
            
            if len(readable_chars) > 10:  # 如果找到足够长的字符串
                text = ''.join(readable_chars).strip()
                if any(char in text for char in '关于根据下列以下法律'):
                    text_parts.append(text)
            
            i += 1
        
        return '\n'.join(text_parts) if text_parts else None
    except Exception as e:
        print(f"手动提取失败: {e}")
        return None

def main():
    doc_path = '/Users/acheng/Downloads/law-exam-assistant/1.2024年回忆版真题（客观卷）_扫描版.doc'
    
    if not os.path.exists(doc_path):
        print(f"文件不存在: {doc_path}")
        return
    
    print(f"尝试处理WPS文档: {doc_path}")
    
    # 方法1: OLE文件解析
    text = extract_wps_doc_text(doc_path)
    
    if not text:
        print("OLE方法失败，尝试手动提取...")
        # 方法2: 手动文本提取
        text = try_manual_text_extraction(doc_path)
    
    if text:
        # 保存提取的文本
        output_path = '/Users/acheng/Downloads/law-exam-assistant/extracted_questions_from_doc.txt'
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(text)
        
        print(f"成功提取文本，保存到: {output_path}")
        print(f"\n文本预览 (前1000字符):")
        print("=" * 50)
        print(text[:1000])
        print("=" * 50)
    else:
        print("无法从.doc文件中提取文本")
        print("建议手动将.doc文件转换为.docx格式")

if __name__ == "__main__":
    main()