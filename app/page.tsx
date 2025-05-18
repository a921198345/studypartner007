import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">学习搭子</h1>
        <p className="text-xl text-center mb-12">智能法考辅助平台</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
          <Link href="/ai-chat" className="group bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-2xl font-semibold mb-2 text-blue-600">AI问答</h2>
            <p className="text-gray-600">基于法考知识库的智能问答系统</p>
          </Link>
          
          <Link href="/knowledge-map" className="group bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-2xl font-semibold mb-2 text-blue-600">知识导图</h2>
            <p className="text-gray-600">交互式法律知识结构可视化</p>
          </Link>
          
          <Link href="/question-bank" className="group bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-2xl font-semibold mb-2 text-blue-600">真题库</h2>
            <p className="text-gray-600">历年法考真题练习与解析</p>
          </Link>
          
          <Link href="/learning-plan" className="group bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-2xl font-semibold mb-2 text-blue-600">学习计划</h2>
            <p className="text-gray-600">个性化学习路径规划</p>
          </Link>
        </div>
        
        <div className="mt-12 text-center">
          <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full mr-4">
            登录
          </Link>
          <Link href="/register" className="bg-white hover:bg-gray-100 text-blue-600 font-bold py-2 px-6 rounded-full border border-blue-600">
            注册
          </Link>
        </div>
      </div>
    </main>
  );
} 