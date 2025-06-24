import React, { useState, useEffect, useCallback } from 'react';
import { Tag, Space } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';

/**
 * 知识导图快速导航组件
 * 提供历史记录快速访问功能
 */
const MindMapQuickNav = ({ 
  currentPath = [], 
  onNavigate, 
  subject = '民法' 
}) => {
  const [recentNodes, setRecentNodes] = useState([]);

  // 更新最近访问
  const updateRecentNodes = useCallback((path) => {
    const nodeInfo = {
      path: path,
      name: path[path.length - 1],
      timestamp: Date.now()
    };
    
    setRecentNodes(prev => {
      const newRecent = [nodeInfo, ...prev.filter(r => 
        r.path.join('->') !== path.join('->')
      )].slice(0, 5);
      
      localStorage.setItem(`mindmap_recent_${subject}`, JSON.stringify(newRecent));
      return newRecent;
    });
  }, [subject]);

  // 加载历史记录
  useEffect(() => {
    const savedRecent = localStorage.getItem(`mindmap_recent_${subject}`);
    if (savedRecent) setRecentNodes(JSON.parse(savedRecent));
  }, [subject]);

  // 监听当前路径变化，自动更新最近访问
  useEffect(() => {
    if (currentPath && currentPath.length > 1) {
      // 保存完整路径（包含学科名），这样导航时能正确展开
      updateRecentNodes(currentPath);
    }
  }, [currentPath, updateRecentNodes]);

  // 快速导航到节点
  const quickNavigate = (path) => {
    console.log('🚀 MindMapQuickNav.quickNavigate 被调用，路径:', path);
    updateRecentNodes(path);
    if (onNavigate) {
      onNavigate(path);
    }
  };

  // 如果没有历史记录，不显示组件
  if (recentNodes.length === 0) {
    return null;
  }

  return (
    <div className="mindmap-quick-nav" style={{ 
      marginBottom: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ color: '#666', fontSize: '14px', whiteSpace: 'nowrap' }}>
          <HistoryOutlined style={{ marginRight: '4px' }} />
          最近访问
        </span>
        <Space size={[8, 8]} wrap>
          {recentNodes.map((node, index) => (
            <Tag 
              key={index}
              color="blue"
              style={{ 
                cursor: 'pointer', 
                margin: 0,
                padding: '2px 10px',
                fontSize: '13px'
              }}
              onClick={() => quickNavigate(node.path)}
            >
              {node.name}
            </Tag>
          ))}
        </Space>
      </div>
    </div>
  );
};

export default MindMapQuickNav;