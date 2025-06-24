import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

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
 * 基于D3.js的自定义树形图组件
 * 完全可控的展开/折叠状态
 */
const D3TreeViewer = ({ 
  data, 
  onNodeClick, 
  expandedNodes = new Set(),
  onExpandedNodesChange,
  forceNavigationTrigger 
}) => {
  const svgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // 处理强制导航
  useEffect(() => {
    if (forceNavigationTrigger && forceNavigationTrigger.path) {
      const pathNodes = new Set();
      let currentPath = '';
      
      forceNavigationTrigger.path.forEach(node => {
        currentPath = currentPath ? `${currentPath}->${node}` : node;
        pathNodes.add(currentPath);
      });
      
      onExpandedNodesChange?.(new Set([...expandedNodes, ...pathNodes]));
    }
  }, [forceNavigationTrigger]);

  useEffect(() => {
    if (!data) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = dimensions.width;
    const height = dimensions.height;
    const margin = { top: 20, right: 120, bottom: 20, left: 120 };

    const treeLayout = d3.tree()
      .size([height - margin.top - margin.bottom, width - margin.left - margin.right]);

    // 构建层次结构
    const root = d3.hierarchy(data);
    
    // 根据expandedNodes状态控制展开
    root.each(d => {
      const nodePath = getNodePath(d);
      d._children = d.children;
      if (!expandedNodes.has(nodePath)) {
        d.children = null;
      }
    });

    treeLayout(root);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // 绘制连线
    g.selectAll(".link")
      .data(root.links())
      .enter().append("path")
      .attr("class", "link")
      .attr("d", d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x))
      .style("fill", "none")
      .style("stroke", "#ccc")
      .style("stroke-width", "2px");

    // 绘制节点
    const node = g.selectAll(".node")
      .data(root.descendants())
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.y},${d.x})`)
      .style("cursor", "pointer");

    // 节点圆圈
    node.append("circle")
      .attr("r", 8)
      .style("fill", d => d._children ? "#fff" : "#ccc")
      .style("stroke", "#000")
      .style("stroke-width", "2px")
      .on("click", (event, d) => {
        const nodePath = getNodePath(d);
        const newExpanded = new Set(expandedNodes);
        
        if (expandedNodes.has(nodePath)) {
          newExpanded.delete(nodePath);
        } else {
          newExpanded.add(nodePath);
        }
        
        onExpandedNodesChange?.(newExpanded);
      });

    // 节点文本
    node.append("text")
      .attr("dy", "0.35em")
      .attr("x", d => d.children || d._children ? -12 : 12)
      .style("text-anchor", d => d.children || d._children ? "end" : "start")
      .style("font-size", "14px")
      .text(d => getNodeDisplayName(d.data))
      .on("click", (event, d) => {
        onNodeClick?.(d.data);
      });

  }, [data, expandedNodes, dimensions]);

  // 获取节点路径的辅助函数
  const getNodePath = (node) => {
    const path = [];
    let current = node;
    while (current) {
      path.unshift(getNodeDisplayName(current.data));
      current = current.parent;
    }
    return path.join('->');
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default D3TreeViewer;