"use client";
   
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadQuestions() {
  const [file, setFile] = useState(null);
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [formatIssues, setFormatIssues] = useState([]);
  const [showFormatIssues, setShowFormatIssues] = useState(false);
  const [fixedFile, setFixedFile] = useState(null);
  const router = useRouter();

  const subjects = [
    '民法', '刑法', '行政法', '民事诉讼法', '刑事诉讼法', 
    '行政诉讼法', '商法', '国际法', '理论法学', '经济法'
  ];

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
      // 重置之前的状态
      setFormatIssues([]);
      setShowFormatIssues(false);
      setFixedFile(null);
      setMessage('');
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
      
      // 处理格式问题
      if (data.format_issues && Object.keys(data.format_issues).length > 0) {
        setFormatIssues(data.format_issues);
        setShowFormatIssues(true);
        setMessage(`上传完成，但发现${Object.keys(data.format_issues).length}个题目存在格式问题。已成功解析${data.parsed_questions}/${data.total_questions}道题目。`);
      } else {
        setMessage(`上传成功！${data.message}`);
      }
    } catch (error) {
      setMessage(`错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFixFormatIssues = async () => {
    setLoading(true);
    setMessage('正在修复格式问题，请稍候...');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subject', subject);
      formData.append('autoFix', 'true');
      
      const response = await fetch('/api/admin/fix-question-format', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '修复失败');
      }
      
      // 检查是否返回修复后的文件
      const blob = await response.blob();
      const fixedFile = new File([blob], `${subject}_fixed.docx`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      
      setFixedFile(fixedFile);
      setMessage('格式问题已修复，您可以下载修复后的文件重新上传');
    } catch (error) {
      setMessage(`修复错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadFixedFile = () => {
    if (!fixedFile) return;
    
    const url = URL.createObjectURL(fixedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = fixedFile.name;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">上传法考真题</h1>
      
      {message && (
        <div className={`p-4 mb-4 rounded ${
          message.includes('成功') ? 'bg-green-100 text-green-800' : 
          message.includes('修复') ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}
      
      {/* 显示格式问题 */}
      {showFormatIssues && Object.keys(formatIssues).length > 0 && (
        <div className="mb-6 border rounded p-4 bg-red-50">
          <h2 className="text-lg font-semibold mb-2 text-red-800">检测到格式错误：</h2>
          
          {/* 错误统计摘要 */}
          <div className="mb-4 p-3 bg-white rounded border border-red-200">
            <h3 className="font-medium mb-2">错误类型统计：</h3>
            <ul className="space-y-1">
              <li>• 选项数量错误: {Object.values(formatIssues).filter(d => 
                d.issues.some(i => i.includes('选项数量错误'))).length} 个题目</li>
              <li>• 缺少选项: {Object.values(formatIssues).filter(d => 
                d.issues.some(i => i.includes('缺少选项'))).length} 个题目</li>
              <li>• 缺少解析标记: {Object.values(formatIssues).filter(d => 
                d.issues.some(i => i.includes('缺少【解析】标记'))).length} 个题目</li>
              <li>• 缺少答案标识: {Object.values(formatIssues).filter(d => 
                d.issues.some(i => i.includes('缺少明确的答案标识'))).length} 个题目</li>
            </ul>
          </div>
          
          <div className="max-h-60 overflow-y-auto border border-red-200 rounded p-2">
            {Object.entries(formatIssues).map(([questionId, details]) => (
              <div key={questionId} className="mb-3 p-2 border-b border-red-100">
                <p className="font-medium text-red-700">题号【{questionId}】:</p>
                <ul className="list-disc pl-5">
                  {details.issues.map((issue, i) => (
                    <li key={i} className="text-red-600 text-sm">{issue}</li>
                  ))}
                </ul>
                <details className="mt-1">
                  <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                    查看题目内容
                  </summary>
                  <p className="text-xs text-gray-500 mt-1 p-2 bg-gray-50 rounded">
                    {details.text}
                  </p>
                </details>
              </div>
            ))}
          </div>
          
          <div className="flex space-x-4 mt-4">
            <button 
              onClick={handleFixFormatIssues}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? '处理中...' : '自动修复格式问题'}
            </button>
            
            {fixedFile && (
              <button 
                onClick={downloadFixedFile}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                下载修复后的文件
              </button>
            )}
          </div>
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
            <li>题目格式应为: 【题号】题干 A.选项A B.选项B C.选项C D.选项D 【解析】解析内容</li>
            <li>题号格式为8位数字，如【20220201】表示2022年第2题的第1小问</li>
            <li>必须有且仅有4个选项(A-D)，每个选项格式统一</li>
            <li>答案会自动从解析中识别，解析中必须包含明确的答案标识</li>
            <li>如果解析找到多个字母答案(如AB)，会自动识别为多选题</li>
            <li>避免多余的空行和格式，保持题目之间紧密相连</li>
          </ul>
        </div>
      </div>
    </div>
  );
}