'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface RecentNode {
  path: string[];
  name: string;
  timestamp: number;
}

interface MindMapQuickNavProps {
  currentPath?: string[];
  onNavigate?: (path: string[]) => void;
  subject?: string;
}

/**
 * 知识导图快速导航组件
 * 提供历史记录快速访问功能
 */
export default function MindMapQuickNav({ 
  currentPath = [], 
  onNavigate, 
  subject = '民法' 
}: MindMapQuickNavProps) {
  const [recentNodes, setRecentNodes] = useState<RecentNode[]>([]);

  // 更新最近访问
  const updateRecentNodes = useCallback((path: string[]) => {
    if (!path || path.length === 0) return;
    
    const nodeInfo: RecentNode = {
      path: path,
      name: path[path.length - 1],
      timestamp: Date.now()
    };
    
    setRecentNodes(prev => {
      const newRecent = [nodeInfo, ...prev.filter(r => 
        r.path.join('->') !== path.join('->')
      )].slice(0, 5);
      
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`mindmap_recent_${subject}`, JSON.stringify(newRecent));
        } catch (error) {
          console.error('保存历史记录失败:', error);
        }
      }
      return newRecent;
    });
  }, [subject]);

  // 加载历史记录
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedRecent = localStorage.getItem(`mindmap_recent_${subject}`);
        if (savedRecent) {
          const parsed = JSON.parse(savedRecent);
          if (Array.isArray(parsed)) {
            setRecentNodes(parsed);
          }
        }
      } catch (error) {
        console.error('解析历史记录失败:', error);
      }
    }
  }, [subject]);

  // 监听当前路径变化，自动更新最近访问
  useEffect(() => {
    if (currentPath && currentPath.length > 1) {
      updateRecentNodes(currentPath);
    }
  }, [currentPath, updateRecentNodes]);

  // 快速导航到节点
  const quickNavigate = useCallback((path: string[]) => {
    console.log('🚀 MindMapQuickNav.quickNavigate 被调用，路径:', path);
    updateRecentNodes(path);
    if (onNavigate) {
      onNavigate(path);
    }
  }, [onNavigate, updateRecentNodes]);

  // 如果没有历史记录，不显示组件
  if (recentNodes.length === 0) {
    return null;
  }

  return (
    <div className="mindmap-quick-nav mb-3">
      <div className="flex items-center gap-3">
        <span className="text-gray-600 text-sm whitespace-nowrap flex items-center">
          <Clock className="w-4 h-4 mr-1" />
          最近访问
        </span>
        <div className="flex flex-wrap gap-2">
          {recentNodes.map((node, index) => (
            <Badge
              key={`${node.name}-${index}`}
              variant="secondary"
              className="cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors text-xs px-2 py-1"
              onClick={() => quickNavigate(node.path)}
            >
              {node.name}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}