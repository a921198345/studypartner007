import React from 'react';
import Link from 'next/link';

/**
 * 展示AI回答中提取的关键知识点组件
 * 
 * @param {Object} props
 * @param {Array} props.knowledgePoints - 知识点列表
 * @param {string} props.subject - 学科名称
 */
const KnowledgePointsList = ({ knowledgePoints, subject }) => {
  // 如果没有知识点，不显示任何内容
  if (!knowledgePoints || knowledgePoints.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="text-md font-medium text-gray-700 mb-2">相关知识点</h3>
      <div className="flex flex-wrap gap-2">
        {knowledgePoints.map(point => (
          <Link 
            key={point.id} 
            href={`/knowledge-map/${encodeURIComponent(subject)}?highlight=${encodeURIComponent(point.name)}`}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            {point.name}
          </Link>
        ))}
      </div>
      <div className="mt-2 text-xs text-gray-500">
        点击知识点查看相关知识导图
      </div>
    </div>
  );
};

export default KnowledgePointsList; 