import React, { useState, useEffect, useMemo } from 'react';
import { Tree } from 'antd';

// 解码节点文本的辅助函数
const decodeNodeText = (encodedText) => {
  if (!encodedText) return '';
  
  try {
    // URL解码
    let decoded = decodeURIComponent(encodedText);
    
    // 移除HTML标签，提取纯文本
    decoded = decoded.replace(/<[^>]*>/g, '');
    
    // 解码HTML实体
    const htmlEntities = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' '
    };
    
    for (const [entity, char] of Object.entries(htmlEntities)) {
      decoded = decoded.replace(new RegExp(entity, 'g'), char);
    }
    
    return decoded.trim();
  } catch (error) {
    console.warn('解码文本失败:', error.message);
    return encodedText;
  }
};

// 获取节点显示名称的函数
const getNodeDisplayName = (nodeData) => {
  // 如果有名称且不是"未命名节点"，直接返回
  if (nodeData.name && nodeData.name !== '未命名节点' && nodeData.name.trim()) {
    return nodeData.name;
  }
  
  // 尝试从attributes中解码_mubu_text
  if (nodeData.attributes && nodeData.attributes._mubu_text) {
    const decoded = decodeNodeText(nodeData.attributes._mubu_text);
    if (decoded) {
      return decoded;
    }
  }
  
  // 最后返回原名称或默认值
  return nodeData.name || '未命名节点';
};

/**
 * 基于Ant Design Tree的可控树形图
 * 提供完全可控的展开状态管理
 */
const AntdTreeViewer = ({ 
  data, 
  onNodeSelect, 
  forceNavigationTrigger,
  searchTerm = '' 
}) => {
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);

  // 转换数据格式为Antd Tree所需格式
  const treeData = useMemo(() => {
    const convertToAntdFormat = (node, parentKey = '') => {
      const displayName = getNodeDisplayName(node);
      const key = parentKey ? `${parentKey}-${displayName}` : displayName;
      
      return {
        title: (
          <span 
            style={{ 
              backgroundColor: searchTerm && displayName.includes(searchTerm) ? '#fff3cd' : 'transparent',
              padding: '2px 4px',
              borderRadius: '3px'
            }}
          >
            {displayName}
          </span>
        ),
        key,
        children: node.children ? node.children.map(child => 
          convertToAntdFormat(child, key)
        ) : undefined,
        isLeaf: !node.children || node.children.length === 0,
        data: node // 保存原始数据
      };
    };
    
    return data ? [convertToAntdFormat(data)] : [];
  }, [data, searchTerm]);

  // 处理强制导航
  useEffect(() => {
    if (forceNavigationTrigger && forceNavigationTrigger.path) {
      const targetPath = forceNavigationTrigger.path;
      const keysToExpand = [];
      let currentKey = '';
      
      // 构建需要展开的所有父级键
      targetPath.forEach((nodeName, index) => {
        currentKey = currentKey ? `${currentKey}-${nodeName}` : nodeName;
        if (index < targetPath.length - 1) {
          keysToExpand.push(currentKey);
        }
      });
      
      // 更新展开状态
      setExpandedKeys(prev => {
        const newKeys = new Set([...prev, ...keysToExpand]);
        return Array.from(newKeys);
      });
      
      // 选中目标节点
      const targetKey = currentKey;
      setSelectedKeys([targetKey]);
      
      // 通知父组件节点被选中
      setTimeout(() => {
        const targetNode = findNodeByPath(data, targetPath);
        if (targetNode && onNodeSelect) {
          const parentPath = targetPath.slice(0, -1);
          onNodeSelect(targetNode, targetPath.length, parentPath);
        }
      }, 100);
    }
  }, [forceNavigationTrigger, data, onNodeSelect]);

  // 根据路径查找节点的辅助函数
  const findNodeByPath = (node, path) => {
    if (!node || !path || path.length === 0) return null;
    
    if (path.length === 1) {
      return node.name === path[0] ? node : null;
    }
    
    if (node.name === path[0] && node.children) {
      for (const child of node.children) {
        const result = findNodeByPath(child, path.slice(1));
        if (result) return result;
      }
    }
    
    return null;
  };

  // 处理节点选择
  const handleSelect = (selectedKeys, info) => {
    setSelectedKeys(selectedKeys);
    
    if (selectedKeys.length > 0 && onNodeSelect) {
      const key = selectedKeys[0];
      const pathArray = key.split('-');
      const targetNode = findNodeByPath(data, pathArray);
      
      if (targetNode) {
        const parentPath = pathArray.slice(0, -1);
        onNodeSelect(targetNode, pathArray.length, parentPath);
      }
    }
  };

  // 处理节点展开
  const handleExpand = (expandedKeys) => {
    setExpandedKeys(expandedKeys);
  };

  return (
    <div style={{ 
      padding: '20px',
      height: '100%',
      overflow: 'auto',
      backgroundColor: '#fff'
    }}>
      <Tree
        treeData={treeData}
        expandedKeys={expandedKeys}
        selectedKeys={selectedKeys}
        onSelect={handleSelect}
        onExpand={handleExpand}
        showLine={true}
        showIcon={false}
        blockNode={true}
        style={{
          fontSize: '14px',
          lineHeight: '28px'
        }}
      />
    </div>
  );
};

export default AntdTreeViewer;