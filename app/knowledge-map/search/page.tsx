'use client';

import { useState } from 'react';
import VectorSearch from '@/components/knowledge-map/VectorSearch';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * 法律知识搜索页面组件
 * 
 * 集成向量搜索功能，允许用户搜索法律文档内容
 */
export default function KnowledgeSearchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchResults, setSearchResults] = useState([]);
  
  // 如果用户未登录，重定向到登录页
  if (status === "unauthenticated") {
    router.push('/login');
    return null;
  }

  // 处理搜索结果
  const handleSearchResults = (results) => {
    setSearchResults(results);
    // 这里可以添加额外的逻辑，如保存搜索历史等
  };
  
  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">法律知识搜索</h1>
        <p className="text-gray-600">
          基于向量相似度检索法律文档，支持语义搜索。你可以提问法律问题，系统将返回最相关的法律条文和解释。
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <VectorSearch onResult={handleSearchResults} />
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border h-fit">
          <h2 className="text-lg font-semibold mb-4">搜索提示</h2>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">1</span>
              <span>尝试使用<strong>自然语言问题</strong>进行搜索，例如"什么是民事行为能力？"</span>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">2</span>
              <span>使用<strong>过滤条件</strong>缩小搜索范围，如只搜索特定法律或条文</span>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">3</span>
              <span>搜索<strong>法律概念</strong>可以找到相关的条文和定义</span>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">4</span>
              <span>使用<strong>法律术语</strong>通常能获得更精准的结果</span>
            </li>
          </ul>
          
          <div className="mt-8 pt-4 border-t">
            <h3 className="font-medium mb-2">示例问题:</h3>
            <div className="space-y-2">
              <button 
                onClick={() => {
                  const exampleQuery = "民事行为能力的分类有哪些？";
                  document.getElementById('query').value = exampleQuery;
                  document.getElementById('query').focus();
                }}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
              >
                民事行为能力的分类有哪些？
              </button>
              <button 
                onClick={() => {
                  const exampleQuery = "合同成立的条件是什么？";
                  document.getElementById('query').value = exampleQuery;
                  document.getElementById('query').focus();
                }}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
              >
                合同成立的条件是什么？
              </button>
              <button 
                onClick={() => {
                  const exampleQuery = "什么是诉讼时效？";
                  document.getElementById('query').value = exampleQuery;
                  document.getElementById('query').focus();
                }}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
              >
                什么是诉讼时效？
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 