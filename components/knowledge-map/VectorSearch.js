import { useState } from 'react';

/**
 * 法律文档向量搜索组件
 * 
 * 提供语义搜索功能，基于向量相似度检索法律文档。
 */
const VectorSearch = ({ onResult }) => {
  // 状态
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [lawName, setLawName] = useState('');
  const [article, setArticle] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  /**
   * 执行向量搜索
   */
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('请输入搜索内容');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // 准备过滤条件
      const filters = {};
      if (lawName) filters.law_name = lawName;
      if (article) filters.article = article;
      
      // 发送搜索请求
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          top_k: topK,
          filters: filters
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResults(data.results);
        
        // 如果提供了回调函数，则传递结果
        if (onResult && typeof onResult === 'function') {
          onResult(data.results);
        }
      } else {
        setError(data.message || '搜索失败');
        setResults([]);
      }
    } catch (err) {
      setError(`搜索出错: ${err.message}`);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 重置搜索表单
   */
  const handleReset = () => {
    setQuery('');
    setTopK(5);
    setLawName('');
    setArticle('');
    setResults([]);
    setError('');
  };

  /**
   * 渲染搜索结果项
   */
  const renderResultItem = (item, index) => {
    return (
      <div key={index} className="border rounded-lg p-4 mb-4 bg-white shadow-sm">
        <div className="text-sm text-gray-600 mb-2 flex flex-wrap gap-2">
          {item.law_name && (
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
              法律: {item.law_name}
            </span>
          )}
          {item.book && item.book !== '未识别' && (
            <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-md">
              编: {item.book}
            </span>
          )}
          {item.chapter && item.chapter !== '未识别' && (
            <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-md">
              章: {item.chapter}
            </span>
          )}
          {item.section && item.section !== '未识别' && (
            <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-md">
              节: {item.section}
            </span>
          )}
          {item.article && item.article !== '未识别' && (
            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-md font-medium">
              第{item.article}条
            </span>
          )}
        </div>
        <div className="p-3 bg-gray-50 rounded border-l-4 border-blue-500 text-gray-900">
          {item.original_text}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* 搜索表单 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-1">
              请输入搜索内容
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="text"
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="例如：什么是民事行为能力？"
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2 items-center">
              <label htmlFor="topK" className="block text-sm font-medium text-gray-700">
                结果数量:
              </label>
              <select
                id="topK"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="rounded-md border border-gray-300 py-1 pl-2 pr-8 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
            
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
            >
              {showFilters ? '隐藏高级过滤' : '显示高级过滤'}
            </button>
          </div>
          
          {/* 高级过滤选项 */}
          {showFilters && (
            <div className="p-3 border border-gray-200 rounded-md bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="lawName" className="block text-sm font-medium text-gray-700 mb-1">
                  法律名称
                </label>
                <input
                  type="text"
                  id="lawName"
                  value={lawName}
                  onChange={(e) => setLawName(e.target.value)}
                  placeholder="例如：中华人民共和国民法典"
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="article" className="block text-sm font-medium text-gray-700 mb-1">
                  条文
                </label>
                <input
                  type="text"
                  id="article"
                  value={article}
                  onChange={(e) => setArticle(e.target.value)}
                  placeholder="例如：一百零一"
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              重置
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? '正在搜索...' : '搜索'}
            </button>
          </div>
        </form>
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* 搜索结果 */}
      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">搜索结果 ({results.length})</h3>
          </div>
          <div className="space-y-4">
            {results.map(renderResultItem)}
          </div>
        </div>
      )}

      {/* 无搜索结果提示 */}
      {!error && results.length === 0 && !loading && query && (
        <div className="text-center py-8">
          <p className="text-gray-500">没有找到匹配的结果。请尝试其他搜索词或修改过滤条件。</p>
        </div>
      )}
    </div>
  );
};

export default VectorSearch; 