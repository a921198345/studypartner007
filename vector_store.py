#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
向量化和向量数据库存储模块
用于将文本块转换为向量嵌入，并存储到向量数据库中
支持：
1. DeepSeek API生成向量嵌入
2. MySQL/SQLite存储向量数据
3. 向量检索功能
"""

import os
import json
import time
import numpy as np
import requests
from typing import List, Dict, Any, Union, Optional
import logging
import sqlite3
import pickle
import base64
import math

# 导入统一的 Embedding 服务
try:
    from embedding_service import EmbeddingService
    EMBEDDING_SERVICE_AVAILABLE = True
except ImportError:
    EMBEDDING_SERVICE_AVAILABLE = False
    print("Embedding 服务模块未找到，将使用原有方案")

# 导入 Jina
try:
    from jina_embedding import JinaEmbedding
    JINA_AVAILABLE = True
except ImportError:
    JINA_AVAILABLE = False

# 加载环境变量
from dotenv import load_dotenv
load_dotenv('.env.local')

# 可选：如果安装了faiss，则导入用于高效向量检索
try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False
    print("FAISS库未安装，将使用原生向量检索方法")

# 可选：如果安装了MySQL连接器，则导入
try:
    import mysql.connector
    from mysql.connector import Error as MySQLError
    MYSQL_AVAILABLE = True
except ImportError:
    MYSQL_AVAILABLE = False
    print("MySQL连接器未安装，将使用SQLite作为备用")
    MySQLError = Exception  # 定义一个占位符

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('vector_store')

class VectorStore:
    """向量存储类，处理向量化和数据库存储"""
    
    def __init__(
        self,
        database_type: str = "sqlite",
        mysql_config: Dict[str, Any] = None,
        sqlite_path: str = "data/vector_store.db",
        api_key: str = None,
        embedding_model: str = "text-embedding-ada-002",
        db_config: Dict[str, Any] = None  # 添加db_config参数
    ):
        """
        初始化向量存储
        
        Args:
            database_type: 数据库类型，支持'mysql'或'sqlite'
            mysql_config: MySQL连接配置
            sqlite_path: SQLite数据库文件路径
            api_key: DeepSeek API密钥，如果为None则尝试从环境变量DEEPSEEK_API_KEY获取
            embedding_model: 使用的向量嵌入模型
            db_config: 数据库配置，与mysql_config兼容，优先使用
        """
        self.database_type = database_type
        # 优先使用db_config，如果提供了的话
        self.mysql_config = db_config if db_config is not None else mysql_config
        self.sqlite_path = sqlite_path
        
        # 优先使用传入的API密钥，否则尝试从环境变量获取
        self.api_key = api_key or os.environ.get('DEEPSEEK_API_KEY')
        if not self.api_key:
            logger.warning("未设置DeepSeek API密钥，向量嵌入功能将不可用。请设置DEEPSEEK_API_KEY环境变量或直接传递api_key参数。")
        
        self.embedding_model = embedding_model
        self.vector_dim = 1536  # DeepSeek默认向量维度
        self.index = None  # FAISS索引
        self.doc_ids = []  # 文档ID列表
        
        # 确保数据库已初始化
        self.init_database()
        
        # 确保SQLite数据库目录存在
        if self.database_type == 'sqlite':
            os.makedirs(os.path.dirname(sqlite_path), exist_ok=True)
    
    def check_table_columns(self):
        """检查表的字段结构，返回可用字段列表"""
        available_columns = []
        if self.database_type == 'mysql' and MYSQL_AVAILABLE:
            try:
                conn = mysql.connector.connect(**self.mysql_config)
                cursor = conn.cursor()
                cursor.execute("DESCRIBE vector_chunks")
                columns = cursor.fetchall()
                available_columns = [col[0] for col in columns]
                cursor.close()
                conn.close()
            except Exception as e:
                logger.error(f"检查表结构失败: {str(e)}")
        return available_columns

    def init_database(self):
        """初始化数据库表结构"""
        if self.database_type == 'mysql' and MYSQL_AVAILABLE:
            try:
                conn = mysql.connector.connect(**self.mysql_config)
                cursor = conn.cursor()
                
                # 创建向量存储表
                cursor.execute('''
                CREATE TABLE IF NOT EXISTS vector_chunks (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    doc_id VARCHAR(50) NOT NULL,
                    subject_area VARCHAR(30),
                    chunk_index INT NOT NULL,
                    original_text TEXT NOT NULL,
                    vector_embedding LONGBLOB NOT NULL,
                    source_document_name VARCHAR(100) NOT NULL,
                    chunk_id_in_document VARCHAR(50) NOT NULL,
                    law_name VARCHAR(100),
                    book VARCHAR(50),
                    chapter VARCHAR(100),
                    section VARCHAR(100),
                    article VARCHAR(50),
                    token_count INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX (doc_id, chunk_index),
                    INDEX (source_document_name),
                    INDEX (law_name),
                    INDEX (chapter),
                    INDEX (article)
                ) DEFAULT CHARSET=utf8mb4
                ''')
                
                # 尝试添加 subject_area 列（兼容已存在旧表）
                try:
                    cursor.execute("ALTER TABLE vector_chunks ADD COLUMN subject_area VARCHAR(30)")
                    conn.commit()
                    logger.info("成功添加subject_area字段")
                except Exception as e:
                    logger.warning(f"无法添加subject_area字段: {str(e)}")
                
                conn.commit()
                cursor.close()
                conn.close()
                logger.info("MySQL向量存储表初始化成功")
                
            except Exception as e:
                logger.error(f"MySQL初始化失败: {str(e)}")
                if self.database_type == 'mysql':
                    logger.info("切换到SQLite备用数据库")
                    self.database_type = 'sqlite'
                    self.init_database()
        
        if self.database_type == 'sqlite':
            try:
                conn = sqlite3.connect(self.sqlite_path)
                cursor = conn.cursor()
                
                # 创建向量存储表
                cursor.execute('''
                CREATE TABLE IF NOT EXISTS vector_chunks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    doc_id TEXT NOT NULL,
                    subject_area TEXT,
                    chunk_index INTEGER NOT NULL,
                    original_text TEXT NOT NULL,
                    vector_embedding BLOB NOT NULL,
                    source_document_name TEXT NOT NULL,
                    chunk_id_in_document TEXT NOT NULL,
                    law_name TEXT,
                    book TEXT,
                    chapter TEXT,
                    section TEXT,
                    article TEXT,
                    token_count INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                ''')
                
                # 创建索引
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_doc_chunk ON vector_chunks(doc_id, chunk_index)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_source ON vector_chunks(source_document_name)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_law ON vector_chunks(law_name)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_article ON vector_chunks(article)')
                
                # 尝试添加 subject_area 列，兼容旧表
                try:
                    cursor.execute("ALTER TABLE vector_chunks ADD COLUMN subject_area TEXT")
                    conn.commit()
                except Exception:
                    pass
                
                conn.commit()
                cursor.close()
                conn.close()
                logger.info("SQLite向量存储表初始化成功")
                
            except Exception as e:
                logger.error(f"SQLite初始化失败: {str(e)}")
    
    def get_embedding_from_deepseek(self, text: str) -> List[float]:
        """
        获取文本的向量嵌入（优先使用Jina，否则降级到其他方案）
        
        Args:
            text: 要转换为向量的文本
            
        Returns:
            向量嵌入列表
        """
        # 优先使用 Jina
        if JINA_AVAILABLE and os.getenv('JINA_API_KEY'):
            try:
                if not hasattr(self, 'jina_client'):
                    self.jina_client = JinaEmbedding()
                embeddings = self.jina_client.get_embeddings([text])
                # 更新向量维度为Jina的维度
                self.vector_dim = len(embeddings[0])
                return embeddings[0]
            except Exception as e:
                logger.warning(f"Jina API调用失败: {e}，降级到伪向量")
        
        # 原有的伪向量方案作为降级
        if not self.api_key:
            logger.warning("未设置任何API密钥，使用伪向量")
        
        # 生成一个基于文本内容的伪向量
        import hashlib
        
        # 使用SHA-256哈希
        text_hash = hashlib.sha256(text.encode('utf-8')).digest()
        
        # 将哈希值转换为768维的向量（Jina的标准维度）
        self.vector_dim = 768  # 使用Jina的标准维度
        embedding = []
        for i in range(self.vector_dim):
            # 使用哈希值的不同部分生成浮点数
            byte_index = i % len(text_hash)
            value = text_hash[byte_index] / 255.0  # 归一化到0-1之间
            
            # 添加一些变化以增加向量的多样性
            if i % 2 == 0:
                value = value * 2 - 1  # 转换到-1到1之间
            
            embedding.append(value)
        
        return embedding
    
    def batch_get_embeddings(self, texts: List[str], batch_size: int = 96) -> List[List[float]]:
        """
        批量获取多个文本的向量嵌入
        
        Args:
            texts: 文本列表
            batch_size: 批处理大小（Jina支持最多96个文本）
            
        Returns:
            向量嵌入列表的列表
        """
        # 如果使用Jina，直接批量处理
        if JINA_AVAILABLE and os.getenv('JINA_API_KEY'):
            try:
                if not hasattr(self, 'jina_client'):
                    self.jina_client = JinaEmbedding()
                
                logger.info(f"使用Jina批量处理 {len(texts)} 个文本")
                start_time = time.time()
                
                # Jina支持批量处理，直接调用
                all_embeddings = []
                for i in range(0, len(texts), batch_size):
                    batch = texts[i:i + batch_size]
                    batch_num = i//batch_size + 1
                    total_batches = (len(texts) + batch_size - 1) // batch_size
                    
                    logger.info(f"Jina处理批次 {batch_num}/{total_batches}")
                    embeddings = self.jina_client.get_embeddings(batch)
                    all_embeddings.extend(embeddings)
                    
                    # 显示进度
                    if len(texts) > 50:
                        elapsed = time.time() - start_time
                        progress = len(all_embeddings) / len(texts)
                        logger.info(f"进度: {progress*100:.1f}%, 已处理: {len(all_embeddings)}/{len(texts)}")
                
                # 更新向量维度
                if all_embeddings:
                    self.vector_dim = len(all_embeddings[0])
                
                elapsed = time.time() - start_time
                logger.info(f"✓ Jina向量化完成，用时: {elapsed:.1f}秒")
                return all_embeddings
            except Exception as e:
                logger.error(f"Jina批量处理失败: {e}，降级到逐个处理")
        
        # 降级到原有方案
        embeddings = []
        total_batches = (len(texts) + 10 - 1) // 10  # 降级时使用小批次
        
        # 如果文本量很大，记录开始时间并输出信息
        start_time = time.time()
        if len(texts) > 50:
            logger.info(f"开始处理大量文本嵌入: {len(texts)}个文本，分{total_batches}个批次")
        
        for i in range(0, len(texts), 10):
            batch = texts[i:i + 10]
            batch_num = i//10 + 1
            logger.info(f"处理批次 {batch_num}/{total_batches}，包含{len(batch)}个文本")
            
            # 计算已处理百分比和预计剩余时间
            if batch_num > 1 and len(texts) > 50:
                elapsed = time.time() - start_time
                progress = batch_num / total_batches
                estimated_total = elapsed / progress
                remaining = estimated_total - elapsed
                logger.info(f"进度: {progress*100:.1f}%, 已用时: {elapsed:.1f}秒, 预计剩余: {remaining:.1f}秒")
            
            try:
                # 逐个处理批次中的文本
                for text in batch:
                    try:
                        embedding = self.get_embedding_from_deepseek(text)
                        embeddings.append(embedding)
                    except Exception as e:
                        logger.error(f"获取文本嵌入失败: {str(e)}")
                        # 添加一个零向量作为占位符
                        embeddings.append([0.0] * self.vector_dim)
                
                # 批次间添加小延迟，避免API速率限制
                if batch_num < total_batches:
                    time.sleep(0.2)
            except Exception as e:
                logger.error(f"批次处理失败: {str(e)}")
                # 为批次中的所有文本添加零向量
                embeddings.extend([[0.0] * self.vector_dim] * len(batch))
        
        # 记录完成情况
        if len(texts) > 50:
            total_time = time.time() - start_time
            logger.info(f"向量嵌入处理完成，总耗时: {total_time:.1f}秒，平均每个文本: {total_time/len(texts):.3f}秒")
        
        return embeddings
    
    def vector_to_binary(self, vector: List[float]) -> bytes:
        """将向量列表转换为二进制数据，用于数据库存储"""
        return pickle.dumps(np.array(vector, dtype=np.float32))
    
    def binary_to_vector(self, binary_data: bytes) -> List[float]:
        """将二进制数据转换回向量列表"""
        return pickle.loads(binary_data).tolist()
    
    def store_text_chunks(
        self, 
        doc_id: str, 
        texts: List[str], 
        metadata_list: List[Dict[str, Any]],
        source_document_name: str,
        subject_area: str = "其他"  # 新增参数
    ) -> bool:
        """
        将文本块及其向量嵌入存储到数据库
        
        Args:
            doc_id: 文档ID
            texts: 文本块列表
            metadata_list: 元数据列表，每个文本块一个元数据字典
            source_document_name: 源文档名称
            subject_area: 文档的学科领域，将直接用作 law_name
            
        Returns:
            存储是否成功
        """
        try:
            # 确保数据库表已初始化
            self.init_database()
            
            # 检查文本数量和元数据数量是否匹配
            if len(texts) != len(metadata_list):
                raise ValueError(f"文本数量({len(texts)})与元数据数量({len(metadata_list)})不匹配")
            
            # 获取文本的向量嵌入
            start_time = time.time()
            
            is_large_batch = len(texts) > 50
            
            if is_large_batch:
                logger.info(f"开始处理{len(texts)}个文本块的向量嵌入...")
                
            embeddings = self.batch_get_embeddings(texts)
            
            if is_large_batch:
                embed_time = time.time() - start_time
                logger.info(f"向量嵌入生成完成，耗时: {embed_time:.1f}秒")
                
            # 准备批量插入数据
            insert_data = []
            for i, (text, embedding, metadata) in enumerate(zip(texts, embeddings, metadata_list)):
                vector_binary = self.vector_to_binary(embedding)
                
                # 直接使用传入的 subject_area 作为 law_name
                law_name = subject_area
                
                book = metadata.get('book', '')
                chapter = metadata.get('chapter', '')
                section = metadata.get('section', '')
                article = metadata.get('article', '')
                token_count = metadata.get('token_count', len(text))
                
                # 确定 subject_area (这里的字段也叫 subject_area，保持一致)
                db_subject_area = subject_area
                
                chunk_id = f"{doc_id}_{i}"
                
                insert_data.append((
                    doc_id, i, text, vector_binary, 
                    source_document_name, chunk_id, law_name,
                    book, chapter, section, article, token_count, db_subject_area
                ))
            
            # 向数据库批量插入数据
            batch_size = 100
            total_batches = (len(insert_data) + batch_size - 1) // batch_size
            
            if self.database_type == 'mysql' and MYSQL_AVAILABLE:
                conn = mysql.connector.connect(**self.mysql_config)
                cursor = conn.cursor()
                
                # 检查表结构，决定是否包含subject_area字段
                available_columns = self.check_table_columns()
                has_subject_area = 'subject_area' in available_columns
                
                # 开始事务
                cursor.execute("START TRANSACTION")
                
                # 根据表结构动态构建插入查询
                if has_subject_area:
                    insert_query = """
                    INSERT INTO vector_chunks (
                        doc_id, chunk_index, original_text, vector_embedding, 
                        source_document_name, chunk_id_in_document, law_name,
                        book, chapter, section, article, token_count, subject_area
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    # 保持原有数据结构
                    final_insert_data = insert_data
                else:
                    insert_query = """
                    INSERT INTO vector_chunks (
                        doc_id, chunk_index, original_text, vector_embedding, 
                        source_document_name, chunk_id_in_document, law_name,
                        book, chapter, section, article, token_count
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    # 移除subject_area字段数据
                    final_insert_data = []
                    for item in insert_data:
                        final_insert_data.append(item[:-1])  # 移除最后一个subject_area字段
                    
                logger.info(f"使用{'有' if has_subject_area else '无'}subject_area字段的表结构")
                
                # 分批执行插入
                for batch_idx in range(total_batches):
                    start_idx = batch_idx * batch_size
                    end_idx = min(start_idx + batch_size, len(final_insert_data))
                    batch_data = final_insert_data[start_idx:end_idx]
                    
                    cursor.executemany(insert_query, batch_data)
                    
                    if is_large_batch:
                        progress = (batch_idx + 1) / total_batches
                        logger.info(f"数据库写入进度: {progress*100:.1f}% ({batch_idx+1}/{total_batches}批)")
                
                # 提交事务
                conn.commit()
                cursor.close()
                conn.close()
            else:
                # 使用SQLite
                conn = sqlite3.connect(self.sqlite_path)
                cursor = conn.cursor()
                
                # 开始事务
                cursor.execute("BEGIN TRANSACTION")
                
                # 插入查询
                insert_query = """
                INSERT INTO vector_chunks (
                    doc_id, chunk_index, original_text, vector_embedding, 
                    source_document_name, chunk_id_in_document, law_name,
                    book, chapter, section, article, token_count, subject_area
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """
                
                # 分批执行插入
                for batch_idx in range(total_batches):
                    start_idx = batch_idx * batch_size
                    end_idx = min(start_idx + batch_size, len(insert_data))
                    batch_data = insert_data[start_idx:end_idx]
                    
                    cursor.executemany(insert_query, batch_data)
                    
                    if is_large_batch:
                        progress = (batch_idx + 1) / total_batches
                        logger.info(f"数据库写入进度: {progress*100:.1f}% ({batch_idx+1}/{total_batches}批)")
                
                # 提交事务
                cursor.execute("COMMIT")
                conn.close()
            
            if is_large_batch:
                total_time = time.time() - start_time
                logger.info(f"成功存储{len(texts)}个文本块到{self.database_type}数据库，总耗时: {total_time:.1f}秒")
            else:
                logger.info(f"成功存储{len(texts)}个文本块到{self.database_type}数据库")
                
            return True
            
        except Exception as e:
            logger.error(f"存储文本块失败: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    
    def load_vectors_for_search(self) -> bool:
        """
        从数据库加载向量到内存中，用于搜索
        默认只加载最近添加的10万条记录，避免内存压力
        
        Returns:
            是否成功加载
        """
        try:
            vectors = []
            doc_ids = []
            
            if self.database_type == 'mysql' and MYSQL_AVAILABLE:
                conn = mysql.connector.connect(**self.mysql_config)
                cursor = conn.cursor(dictionary=True)
                
                # 只加载最近的10万条记录
                query = """
                SELECT id, chunk_id_in_document, vector_embedding
                FROM vector_chunks
                ORDER BY created_at DESC
                LIMIT 100000
                """
                
                cursor.execute(query)
                results = cursor.fetchall()
                
                for row in results:
                    vector = self.binary_to_vector(row['vector_embedding'])
                    vectors.append(vector)
                    doc_ids.append(row['chunk_id_in_document'])
                
                cursor.close()
                conn.close()
                
            else:
                # 使用SQLite
                conn = sqlite3.connect(self.sqlite_path)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                # 只加载最近的10万条记录
                query = """
                SELECT id, chunk_id_in_document, vector_embedding
                FROM vector_chunks
                ORDER BY created_at DESC
                LIMIT 100000
                """
                
                cursor.execute(query)
                results = cursor.fetchall()
                
                for row in results:
                    vector = self.binary_to_vector(row['vector_embedding'])
                    vectors.append(vector)
                    doc_ids.append(row['chunk_id_in_document'])
                
                cursor.close()
                conn.close()
            
            # 创建向量索引
            if FAISS_AVAILABLE and vectors:
                vectors_np = np.array(vectors, dtype=np.float32)
                self.vector_dim = vectors_np.shape[1]
                self.index = faiss.IndexFlatL2(self.vector_dim)
                self.index.add(vectors_np)
                self.doc_ids = doc_ids
                logger.info(f"成功加载{len(vectors)}个向量到FAISS索引")
            elif vectors:
                self.index = np.array(vectors, dtype=np.float32)
                self.doc_ids = doc_ids
                logger.info(f"成功加载{len(vectors)}个向量到NumPy数组")
            else:
                logger.warning("没有找到向量数据")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"加载向量失败: {str(e)}")
            return False
    
    def search_similar_texts(
        self,
        query_text: str,
        top_k: int = 5,
        filters: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """
        搜索与查询文本相似的文档
        
        Args:
            query_text: 查询文本
            top_k: 返回最相似的文档数量
            filters: 过滤条件，例如 {'law_name': '中华人民共和国宪法'}
            
        Returns:
            相似文档列表
        """
        try:
            # 检查API密钥是否已设置
            if not self.api_key:
                logger.error("DeepSeek API密钥未设置，无法执行向量搜索")
                return []
            
            # 生成查询文本的向量嵌入
            try:
                query_vector = self.get_embedding_from_deepseek(query_text)
            except Exception as e:
                logger.error(f"生成查询向量失败: {str(e)}")
                return []
            
            # 如果向量索引未加载，则加载
            if self.index is None:
                if not self.load_vectors_for_search():
                    logger.error("无法加载向量索引")
                    return []
            
            # 如果索引不可用，返回空结果
            if self.index is None:
                logger.error("向量索引不可用，无法搜索")
                return []
            
            # 执行向量相似性搜索
            if FAISS_AVAILABLE:
                query_np = np.array([query_vector], dtype=np.float32)
                distances, indices = self.index.search(query_np, min(top_k * 3, len(self.doc_ids)))
                
                # 获取搜索结果ID
                chunk_ids = [self.doc_ids[i] for i in indices[0]]
            else:
                # 如果没有FAISS，使用NumPy计算余弦相似度
                query_np = np.array(query_vector, dtype=np.float32)
                
                # 计算余弦相似度 (点积 / (norm1 * norm2))
                norm_query = np.linalg.norm(query_np)
                norm_docs = np.linalg.norm(self.index, axis=1)
                
                # 避免除零错误
                safe_norm_docs = np.where(norm_docs > 0, norm_docs, 1e-10)
                
                # 计算点积
                dot_products = np.dot(self.index, query_np)
                
                # 计算余弦相似度
                similarities = dot_products / (norm_query * safe_norm_docs)
                
                # 获取相似度最高的索引
                indices = np.argsort(similarities)[::-1][:top_k * 3]
                
                # 获取搜索结果ID
                chunk_ids = [self.doc_ids[i] for i in indices]
            
            # 从数据库获取文档详情
            results = []
            
            if self.database_type == 'mysql' and MYSQL_AVAILABLE:
                conn = mysql.connector.connect(**self.mysql_config)
                cursor = conn.cursor(dictionary=True)
                
                # 构建WHERE子句
                where_clauses = ["chunk_id_in_document IN (%s)" % ','.join(['%s'] * len(chunk_ids))]
                params = chunk_ids.copy()
                
                # 添加过滤条件
                if filters:
                    for key, value in filters.items():
                        if value:
                            where_clauses.append(f"{key} = %s")
                            params.append(value)
                
                # 构建查询
                query = f"""
                SELECT * FROM vector_chunks
                WHERE {' AND '.join(where_clauses)}
                ORDER BY FIELD(chunk_id_in_document, {','.join(['%s'] * len(chunk_ids))})
                LIMIT %s
                """
                
                # 添加排序和限制参数
                params.extend(chunk_ids)
                params.append(top_k)
                
                cursor.execute(query, params)
                results = cursor.fetchall()
                
                # 转换binary字段
                for result in results:
                    if 'vector_embedding' in result:
                        del result['vector_embedding']  # 避免返回大型二进制数据
                
                cursor.close()
                conn.close()
                
            else:
                # 使用SQLite
                conn = sqlite3.connect(self.sqlite_path)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                # 构建WHERE子句
                where_clauses = [f"chunk_id_in_document IN ({','.join(['?'] * len(chunk_ids))})"]
                params = chunk_ids.copy()
                
                # 添加过滤条件
                if filters:
                    for key, value in filters.items():
                        if value:
                            where_clauses.append(f"{key} = ?")
                            params.append(value)
                
                # 构建查询
                query = f"""
                SELECT * FROM vector_chunks
                WHERE {' AND '.join(where_clauses)}
                LIMIT ?
                """
                
                # 添加限制参数
                params.append(top_k)
                
                cursor.execute(query, params)
                results = [dict(row) for row in cursor.fetchall()]
                
                # 转换binary字段
                for result in results:
                    if 'vector_embedding' in result:
                        del result['vector_embedding']  # 避免返回大型二进制数据
                
                cursor.close()
                conn.close()
            
            logger.info(f"找到{len(results)}个相似文档")
            return results
            
        except Exception as e:
            logger.error(f"搜索文档失败: {str(e)}")
            return []

    def count_vector_chunks(self) -> int:
        """
        统计向量数据库中的记录数量
        
        Returns:
            int: 数据库中的记录数
        """
        try:
            # 确保数据库表已初始化
            self.init_database()
            
            if self.database_type == 'mysql' and MYSQL_AVAILABLE:
                conn = mysql.connector.connect(**self.mysql_config)
                cursor = conn.cursor()
                
                cursor.execute("SELECT COUNT(*) FROM vector_chunks")
                count = cursor.fetchone()[0]
                
                cursor.close()
                conn.close()
                
            else:
                # 使用SQLite
                conn = sqlite3.connect(self.sqlite_path)
                cursor = conn.cursor()
                
                cursor.execute("SELECT COUNT(*) FROM vector_chunks")
                count = cursor.fetchone()[0]
                
                cursor.close()
                conn.close()
                
            return count
            
        except Exception as e:
            logger.error(f"统计向量数据库记录数量失败: {str(e)}")
            import traceback
            traceback.print_exc()
            return 0
            
    def search_similar_text(self, query_text: str, top_k: int = 5, filters: Dict[str, str] = None) -> List[Dict[str, Any]]:
        """
        搜索与查询文本最相似的文本块
        
        Args:
            query_text: 查询文本
            top_k: 返回的最大结果数
            filters: 过滤条件字典，例如 {"law_name": "宪法"}
            
        Returns:
            包含最相似文本块信息的字典列表
        """
        try:
            # 确保数据库表已初始化
            self.init_database()
            
            # 尝试使用本地基于关键词的搜索
            try:
                logger.info(f"使用本地向量检索，查询：{query_text[:30]}...")
                return self.search_by_keywords(query_text, top_k, filters)
            except Exception as e:
                logger.warning(f"本地关键词搜索失败: {str(e)}，尝试使用向量搜索")
            
            # 获取查询文本的向量嵌入
            try:
                query_embedding = self.get_embedding_from_deepseek(query_text)
                if query_embedding is None:
                    logger.error("无法获取查询文本的向量嵌入")
                    return []
            except Exception as e:
                logger.error(f"获取向量嵌入失败: {str(e)}，使用关键词匹配作为备用")
                return self.search_by_keywords(query_text, top_k, filters)
                
            # 将向量嵌入转换为二进制
            query_vector_binary = self.vector_to_binary(query_embedding)
            
            # 构建SQL查询
            base_query = """
            SELECT 
                doc_id, chunk_index, original_text, 
                source_document_name, chunk_id_in_document, 
                law_name, book, chapter, section, article,
                token_count
            FROM vector_chunks
            """
            
            filter_conditions = []
            filter_values = []
            
            # 添加过滤条件
            if filters:
                for key, value in filters.items():
                    if key in ['doc_id', 'law_name', 'book', 'chapter', 'section', 'article', 'source_document_name']:
                        filter_conditions.append(f"{key} = ?")
                        filter_values.append(value)
            
            # 构建完整查询
            if filter_conditions:
                filter_sql = " AND ".join(filter_conditions)
                full_query = f"{base_query} WHERE {filter_sql}"
            else:
                full_query = base_query
                
            if self.database_type == 'mysql' and MYSQL_AVAILABLE:
                conn = mysql.connector.connect(**self.mysql_config)
                cursor = conn.cursor(dictionary=True)
                
                # 在MySQL中执行查询
                cursor.execute(full_query.replace("?", "%s"), filter_values)
                
            else:
                # 使用SQLite
                conn = sqlite3.connect(self.sqlite_path)
                conn.row_factory = sqlite3.Row  # 使用Row工厂使结果可以像字典一样访问
                cursor = conn.cursor()
                
                # 在SQLite中执行查询
                cursor.execute(full_query, filter_values)
            
            # 获取所有结果
            all_chunks = []
            for row in cursor.fetchall():
                if self.database_type == 'mysql' and MYSQL_AVAILABLE:
                    chunk = row  # MySQL已经返回字典
                else:
                    # 将SQLite的Row对象转换为字典
                    chunk = dict(row)
                    
                # 添加到结果列表
                all_chunks.append(chunk)
                
            cursor.close()
            conn.close()
            
            # 如果没有找到结果，直接返回
            if not all_chunks:
                return []
                
            # 为每个结果计算与查询的相似度
            for chunk in all_chunks:
                # 加载该块的向量嵌入
                chunk_id = chunk['doc_id']
                chunk_index = chunk['chunk_index']
                
                # 获取该块的向量嵌入
                chunk_embedding = self.get_chunk_embedding(chunk_id, chunk_index)
                if chunk_embedding is None:
                    chunk['score'] = 0
                    continue
                    
                # 计算余弦相似度
                similarity = self.cosine_similarity(query_embedding, chunk_embedding)
                chunk['score'] = similarity
                
            # 按相似度排序
            sorted_chunks = sorted(all_chunks, key=lambda x: x['score'], reverse=True)
            
            # 返回前top_k个结果
            return sorted_chunks[:top_k]
            
        except Exception as e:
            logger.error(f"搜索相似文本失败: {str(e)}")
            import traceback
            traceback.print_exc()
            return []
            
    def get_chunk_embedding(self, doc_id: str, chunk_index: int) -> Optional[List[float]]:
        """
        从数据库获取指定文档块的向量嵌入
        
        Args:
            doc_id: 文档ID
            chunk_index: 块索引
            
        Returns:
            向量嵌入列表，如果找不到则返回None
        """
        try:
            if self.database_type == 'mysql' and MYSQL_AVAILABLE:
                conn = mysql.connector.connect(**self.mysql_config)
                cursor = conn.cursor()
                
                query = "SELECT vector_embedding FROM vector_chunks WHERE doc_id = %s AND chunk_index = %s"
                cursor.execute(query, (doc_id, chunk_index))
                
                result = cursor.fetchone()
                
                cursor.close()
                conn.close()
                
            else:
                # 使用SQLite
                conn = sqlite3.connect(self.sqlite_path)
                cursor = conn.cursor()
                
                query = "SELECT vector_embedding FROM vector_chunks WHERE doc_id = ? AND chunk_index = ?"
                cursor.execute(query, (doc_id, chunk_index))
                
                result = cursor.fetchone()
                
                cursor.close()
                conn.close()
                
            if not result:
                return None
                
            # 从二进制数据转换回向量
            vector_binary = result[0]
            return self.binary_to_vector(vector_binary)
            
        except Exception as e:
            logger.error(f"获取块向量嵌入失败: {str(e)}")
            return None
            
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """
        计算两个向量之间的余弦相似度
        
        Args:
            vec1: 第一个向量
            vec2: 第二个向量
            
        Returns:
            余弦相似度，范围[-1, 1]，值越高表示越相似
        """
        # 检查向量长度是否相同
        if len(vec1) != len(vec2):
            raise ValueError(f"向量长度不匹配: {len(vec1)} vs {len(vec2)}")
            
        # 计算点积
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        
        # 计算向量的模
        magnitude1 = math.sqrt(sum(a * a for a in vec1))
        magnitude2 = math.sqrt(sum(b * b for b in vec2))
        
        # 避免除以零
        if magnitude1 == 0 or magnitude2 == 0:
            return 0
            
        # 计算余弦相似度
        return dot_product / (magnitude1 * magnitude2)

    def search_by_keywords(self, query_text: str, top_k: int = 5, filters: Dict[str, str] = None) -> List[Dict[str, Any]]:
        """
        根据关键词搜索文本块（作为API调用失败时的备份方法）
        
        Args:
            query_text: 查询文本
            top_k: 返回的最大结果数
            filters: 过滤条件字典，例如 {"law_name": "宪法"}
            
        Returns:
            包含匹配文本块信息的字典列表
        """
        try:
            # 确保数据库表已初始化
            self.init_database()
            
            # 从查询文本中提取关键词
            keywords = self._extract_keywords(query_text)
            if not keywords:
                logger.warning("无法从查询文本中提取关键词")
                return []
                
            # 构建SQL查询
            base_query = """
            SELECT 
                doc_id, chunk_index, original_text, 
                source_document_name, chunk_id_in_document, 
                law_name, book, chapter, section, article,
                token_count
            FROM vector_chunks
            """
            
            # 关键词WHERE条件
            keyword_conditions = []
            filter_values = []
            
            # 添加关键词条件
            for keyword in keywords[:3]:  # 最多使用前3个关键词
                keyword_conditions.append("original_text LIKE ?")
                filter_values.append(f"%{keyword}%")
            
            # 添加过滤条件
            filter_conditions = []
            if filters:
                for key, value in filters.items():
                    if key in ['doc_id', 'law_name', 'book', 'chapter', 'section', 'article', 'source_document_name']:
                        filter_conditions.append(f"{key} = ?")
                        filter_values.append(value)
            
            # 构建完整查询
            where_conditions = []
            if keyword_conditions:
                where_conditions.append("(" + " OR ".join(keyword_conditions) + ")")
            if filter_conditions:
                where_conditions.append(" AND ".join(filter_conditions))
            
            if where_conditions:
                full_query = f"{base_query} WHERE {' AND '.join(where_conditions)}"
            else:
                full_query = base_query
                
            # 执行查询
            if self.database_type == 'mysql' and MYSQL_AVAILABLE:
                conn = mysql.connector.connect(**self.mysql_config)
                cursor = conn.cursor(dictionary=True)
                cursor.execute(full_query.replace("?", "%s"), filter_values)
            else:
                # 使用SQLite
                conn = sqlite3.connect(self.sqlite_path)
                conn.row_factory = sqlite3.Row  # 使用Row工厂使结果可以像字典一样访问
                cursor = conn.cursor()
                cursor.execute(full_query, filter_values)
            
            # 获取所有结果
            all_chunks = []
            for row in cursor.fetchall():
                if self.database_type == 'mysql' and MYSQL_AVAILABLE:
                    chunk = row  # MySQL已经返回字典
                else:
                    # 将SQLite的Row对象转换为字典
                    chunk = dict(row)
                    
                # 添加一个简单的相关性分数
                relevance_score = 0
                for keyword in keywords:
                    if keyword.lower() in chunk['original_text'].lower():
                        relevance_score += 1
                
                chunk['score'] = relevance_score / max(len(keywords), 1)
                all_chunks.append(chunk)
                
            cursor.close()
            conn.close()
            
            # 按相关性分数排序
            sorted_chunks = sorted(all_chunks, key=lambda x: x['score'], reverse=True)
            
            # 返回前top_k个结果
            return sorted_chunks[:top_k]
            
        except Exception as e:
            logger.error(f"关键词搜索失败: {str(e)}")
            import traceback
            traceback.print_exc()
            return []
            
    def _extract_keywords(self, text: str) -> List[str]:
        """从文本中提取关键词"""
        # 简单的关键词提取方法
        # 1. 去除停用词
        stopwords = {'的', '了', '和', '与', '或', '在', '是', '有', '什么', '为', '以', '于', '中'}
        
        # 2. 分词（这里简化处理，实际可以使用jieba等分词工具）
        words = []
        for word in text.replace('?', '').replace('？', '').replace('。', ' ').replace('，', ' ').replace(',', ' ').replace('.', ' ').split():
            if len(word) > 1 and word not in stopwords:
                words.append(word)
        
        return words
    
    def _extract_basic_law_name(self, filename: str, content: str = "") -> str:
        """
        基础的法律名称提取方法（当法律名称提取器不可用时使用）
        
        Args:
            filename: 文件名
            content: 文本内容
            
        Returns:
            提取的法律名称
        """
        import os
        import re
        
        # 去除路径，只保留文件名
        base_name = os.path.basename(filename)
        # 去除扩展名
        name_without_ext = os.path.splitext(base_name)[0]
        
        # 简单的法律名称模式
        law_patterns = [
            r'(民法)',
            r'(刑法)',
            r'(行政法)',
            r'(宪法)',
            r'(商法)',
            r'(经济法)',
            r'(劳动法)',
            r'(环境法)',
            r'(知识产权法)',
        ]
        
        # 首先从文件名提取
        for pattern in law_patterns:
            if re.search(pattern, name_without_ext):
                return re.search(pattern, name_without_ext).group(1)
        
        # 从内容的前几行提取
        if content:
            lines = content.split('\n')[:10]  # 只检查前10行
            for line in lines:
                for pattern in law_patterns:
                    if re.search(pattern, line):
                        return re.search(pattern, line).group(1)
        
        # 清理文件名作为默认值
        clean_name = re.sub(r'\d{4}[.\d]*', '', name_without_ext)  # 去除日期
        clean_name = re.sub(r'[^\u4e00-\u9fff\w]', '', clean_name)  # 只保留中文和字母数字
        return clean_name if clean_name else "其他"
    
    def _get_subject_area_from_law_name(self, law_name: str) -> str:
        """
        从法律名称推断学科领域
        
        Args:
            law_name: 法律名称
            
        Returns:
            学科领域
        """
        if not law_name:
            return "其他"
        
        # 学科领域映射
        area_mapping = {
            '民法': '民法',
            '刑法': '刑法', 
            '行政法': '行政法',
            '宪法': '宪法',
            '商法': '商法',
            '经济法': '经济法',
            '劳动法': '劳动法',
            '环境法': '环境法',
            '知识产权法': '知识产权法'
        }
        
        # 检查包含关系
        for key, area in area_mapping.items():
            if key in law_name:
                return area
        
        return "其他"

def main():
    """测试向量存储功能"""
    import argparse
    
    parser = argparse.ArgumentParser(description='向量存储测试工具')
    parser.add_argument('--db', choices=['mysql', 'sqlite'], default='sqlite', help='数据库类型')
    parser.add_argument('--api_key', help='DeepSeek API密钥，也可以通过环境变量DEEPSEEK_API_KEY设置')
    parser.add_argument('--text', help='要转换为向量的测试文本')
    parser.add_argument('--search', help='搜索相似文档的查询文本')
    
    args = parser.parse_args()
    
    # 创建向量存储实例
    vector_store = VectorStore(
        database_type=args.db,
        api_key=args.api_key
    )
    
    # 测试向量生成
    if args.text:
        try:
            text = args.text
            print(f"\n生成文本向量: {text[:50]}...")
            
            # 生成向量
            start_time = time.time()
            embedding = vector_store.get_embedding_from_deepseek(text)
            elapsed = time.time() - start_time
            
            print(f"生成向量成功! 维度: {len(embedding)}, 耗时: {elapsed:.2f}秒")
            print(f"向量片段: {embedding[:5]}... {embedding[-5:]}")
            
            # 存储测试
            print("\n存储向量测试...")
            doc_id = f"test_{int(time.time())}"
            meta = {'law': '测试法律', '章': '测试章节', '条': '测试条款', 'token_count': len(text)}
            
            success = vector_store.store_text_chunks(
                doc_id=doc_id,
                texts=[text],
                metadata_list=[meta],
                source_document_name="测试文档",
                subject_area="其他"
            )
            
            if success:
                print(f"向量存储成功! 文档ID: {doc_id}")
            else:
                print("向量存储失败")
            
        except Exception as e:
            print(f"向量生成失败: {str(e)}")
    
    # 测试向量搜索
    if args.search:
        try:
            query = args.search
            print(f"\n搜索相似文档: {query}")
            
            # 加载向量
            print("加载向量索引...")
            vector_store.load_vectors_for_search()
            
            # 搜索
            start_time = time.time()
            results = vector_store.search_similar_texts(query, top_k=3)
            elapsed = time.time() - start_time
            
            print(f"搜索完成! 找到{len(results)}个结果, 耗时: {elapsed:.2f}秒")
            
            # 显示结果
            for i, result in enumerate(results, 1):
                print(f"\n结果 {i}:")
                print(f"法律: {result.get('law_name')}")
                print(f"章节: {result.get('chapter')}")
                print(f"条款: {result.get('article')}")
                print(f"内容片段: {result.get('original_text')[:100]}...")
                
        except Exception as e:
            print(f"搜索失败: {str(e)}")

if __name__ == "__main__":
    main() 