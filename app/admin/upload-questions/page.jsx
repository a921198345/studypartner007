"use client";
   
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadQuestions() {
  const [file, setFile] = useState(null);
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const subjects = [
    '民法', '刑法', '行政法', '民事诉讼法', '刑事诉讼法', 
    '行政诉讼法', '商法', '国际法', '理论法学', '经济法'
  ];

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file || !subject) {
      setMessage('请选择文件和学科');
      return;
    }
    
    setLoading(true);
    setMessage('正在上传文件，请稍候...');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject', subject);
    
    try {
      const response = await fetch('/api/admin/upload-questions', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '上传失败');
      }
      
      setMessage(`上传成功！${data.message}`);
    } catch (error) {
      setMessage(`错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">上传法考真题</h1>
      
      {message && (
        <div className={`p-4 mb-4 rounded ${
          message.includes('成功') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-2">选择学科:</label>
          <select 
            value={subject} 
            onChange={(e) => setSubject(e.target.value)}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">-- 请选择学科 --</option>
            {subjects.map((sub) => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block mb-2">上传Word文档:</label>
          <input 
            type="file" 
            accept=".docx,.doc" 
            onChange={handleFileChange}
            className="w-full p-2 border rounded"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            支持的格式: .docx, .doc (最大10MB)
          </p>
        </div>
        
        <button 
          type="submit" 
          className={`px-4 py-2 bg-blue-600 text-white rounded ${
            loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
          }`}
          disabled={loading}
        >
          {loading ? '处理中...' : '上传并解析'}
        </button>
      </form>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">上传说明</h2>
        <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
          <ul className="list-disc pl-5 space-y-2">
            <li>文件必须为Word格式(.docx或.doc)</li>
            <li>题目格式应为: 【题号】题干 A.选项A B.选项B... 【解析】解析内容</li>
            <li>题号格式为8位数字，如【20220201】表示2022年第2题的第1小问</li>
            <li>答案会自动从解析中识别</li>
            <li>如果解析找到多个字母答案(如AB)，会自动识别为多选题</li>
          </ul>
        </div>
      </div>
    </div>
  );
}