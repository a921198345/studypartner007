"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadOpml() {
  const [file, setFile] = useState(null);
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const [subjects, setSubjects] = useState([]);

  // 获取科目列表
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await fetch('/api/mindmaps/subjects');
        const data = await res.json();
        if (res.ok) {
          setSubjects(data.subjects || []);
        } else {
          console.error('获取科目失败', data.message);
        }
      } catch (err) {
        console.error('获取科目异常', err);
      }
    };
    fetchSubjects();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
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
    setMessage('正在上传...');

    const formData = new FormData();
    formData.append('opmlFile', file);
    formData.append('subjectName', subject);

    try {
      const res = await fetch('/api/admin/upload-opml', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '上传失败');

      setMessage(`上传成功：${data.data.filePath}`);
    } catch (err) {
      setMessage(`上传失败：${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">上传OPML思维导图</h1>

      {message && (
        <div
          className={`p-4 mb-4 rounded ${message.startsWith('上传成功') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-2">选择学科:</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="border border-gray-300 p-2 rounded w-full"
          >
            <option value="">请选择学科</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-2">选择OPML文件:</label>
          <input
            type="file"
            accept=".opml, .xml"
            onChange={handleFileChange}
            className="border border-gray-300 p-2 rounded w-full"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {loading ? '上传中...' : '开始上传'}
        </button>
      </form>
    </div>
  );
} 