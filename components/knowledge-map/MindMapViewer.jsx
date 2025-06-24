import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Tree from 'react-d3-tree';

// 这是一个基础的MindMapViewer组件
// 它会尝试从 /api/mindmaps/民法 获取数据并使用 react-d3-tree 展示

// 默认民法知识导图数据，用于API调用失败时作为备用
const DEFAULT_CIVIL_LAW_DATA = {
  name: '民法',
  children: [
    {
      name: '民法总则',
      children: [
        { name: '基本规定' },
        { name: '自然人' },
        { name: '法人' },
        { name: '民事法律行为' },
        { name: '代理' },
        { name: '民事权利' },
        { name: '民事责任' },
        { name: '诉讼时效' }
      ]
    },
    {
      name: '物权法',
      children: [
        { name: '通则' },
        { name: '所有权' },
        { name: '用益物权' },
        { name: '担保物权' },
        { name: '占有' }
      ]
    },
    {
      name: '合同法',
      children: [
        { name: '通则' },
        { name: '合同的订立' },
        { name: '合同的效力' },
        { name: '合同的履行' },
        { name: '合同的变更和转让' },
        { name: '合同的权利义务终止' },
        { name: '违约责任' }
      ]
    },
    {
      name: '人格权法',
      children: [
        { name: '一般规定' },
        { name: '生命权、身体权和健康权' },
        { name: '姓名权和名称权' },
        { name: '肖像权' },
        { name: '名誉权和荣誉权' },
        { name: '隐私权和个人信息保护' }
      ]
    }
  ]
};

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
const getNodeDisplayName = (nodeDatum) => {
  // 如果有名称且不是"未命名节点"，直接返回
  if (nodeDatum.name && nodeDatum.name !== '未命名节点' && nodeDatum.name.trim()) {
    return nodeDatum.name;
  }
  
  // 尝试从attributes中解码_mubu_text
  if (nodeDatum.attributes && nodeDatum.attributes._mubu_text) {
    const decoded = decodeNodeText(nodeDatum.attributes._mubu_text);
    if (decoded) {
      return decoded;
    }
  }
  
  // 最后返回原名称或默认值
  return nodeDatum.name || '未命名节点';
};

// 递归搜索节点，为匹配项添加searchMatch属性
const searchNodes = (node, searchTerm) => {
  if (!node || !searchTerm) return false;
  
  // 支持多个搜索词（用逗号分隔）
  const searchTerms = searchTerm.includes(',') 
    ? searchTerm.split(',').map(term => term.trim().toLowerCase()).filter(term => term)
    : [searchTerm.toLowerCase()];
  
  const nodeName = getNodeDisplayName(node).toLowerCase();
  
  // 检查当前节点是否匹配任何搜索词
  let isMatch = false;
  for (const term of searchTerms) {
    if (nodeName.includes(term)) {
      isMatch = true;
      break;
    }
  }
  
  // 设置当前节点的searchMatch属性
  node.searchMatch = isMatch;
  
  // 递归搜索子节点
  let hasMatchingChild = false;
  if (node.children && Array.isArray(node.children) && node.children.length > 0) {
    for (const child of node.children) {
      // 如果任何子节点匹配，则将hasMatchingChild设置为true
      if (searchNodes(child, searchTerm)) {
        hasMatchingChild = true;
      }
    }
  }
  
  // 如果有匹配的子节点，将当前节点标记为路径节点
  if (hasMatchingChild) {
    node.pathToMatch = true;
  }
  
  // 返回此节点或其任何子节点是否匹配
  return isMatch || hasMatchingChild;
};

// 递归计算节点总数的函数
const countAllNodes = (node) => {
  if (!node) return 0;
  
  // 当前节点计数为1
  let count = 1;
  
  // 递归计算所有子节点
  if (node.children && Array.isArray(node.children) && node.children.length > 0) {
    for (const child of node.children) {
      count += countAllNodes(child);
    }
  }
  
  return count;
};

// 这是一个基础的MindMapViewer组件
// 它会尝试从 /api/mindmaps/民法 获取数据并使用 react-d3-tree 展示
const MindMapViewer = ({ subject = '民法', customZoom = 0.45, searchTerm = '', onNodeCountUpdate, onNodeSelect, shouldRestoreState = false, onStateRestored, forceNavigationTrigger = null, onNavigationComplete }) => {
    // mindMapData 用于存储从API获取的树状数据
    const [mindMapData, setMindMapData] = useState(null);
    // 保存一个原始的未经搜索处理的数据副本
    const [originalData, setOriginalData] = useState(null);
    // isLoading 用于跟踪数据加载状态
    const [isLoading, setIsLoading] = useState(true);
    // error 用于存储加载过程中发生的错误
    const [error, setError] = useState(null);
    // 创建树实例引用
    const treeRef = useRef(null);
    // 控制自动调整视图的状态
    const [needsRecentering, setNeedsRecentering] = useState(false);
    // 自定义的缩放状态
    const [zoomLevel, setZoomLevel] = useState(customZoom);
    // 保存节点总数
    const [totalNodeCount, setTotalNodeCount] = useState(0);
    // 保存当前选中的节点
    const [selectedNode, setSelectedNode] = useState(null);

    // 处理自定义缩放级别变化
    useEffect(() => {
        // 当customZoom改变时，更新内部缩放状态
        if (customZoom !== null) {
            setZoomLevel(customZoom);
        }
    }, [customZoom]);

    // 当节点总数变化时，调用回调函数通知父组件
    useEffect(() => {
        if (onNodeCountUpdate && totalNodeCount > 0) {
            onNodeCountUpdate(totalNodeCount);
        }
    }, [totalNodeCount, onNodeCountUpdate]);

    // 简化的查找函数，用于状态恢复和导航
    const findNodeInDataSimple = useCallback((data, targetName) => {
        if (!data) return null;
        if (data.name === targetName) return data;
        // 添加防御性检查，确保children存在且是数组
        if (data.children && Array.isArray(data.children) && data.children.length > 0) {
            for (const child of data.children) {
                const found = findNodeInDataSimple(child, targetName);
                if (found) return found;
            }
        }
        return null;
    }, []);

    // 处理状态恢复
    useEffect(() => {
        if (shouldRestoreState && mindMapData && onStateRestored) {
            console.log('🔄 开始恢复状态...');
            
            try {
                // 1. 尝试从 localStorage 恢复状态
                const stateKey = `mindmap_state_${subject}`;
                const savedState = localStorage.getItem(stateKey);
                
                if (savedState) {
                    const parsedState = JSON.parse(savedState);
                    console.log('📋 找到保存的状态:', parsedState);
                    
                    // 2. 恢复选中的节点
                    if (parsedState.selectedNode && onNodeSelect) {
                        const targetNode = findNodeInDataSimple(mindMapData, parsedState.selectedNode.name);
                        if (targetNode) {
                            console.log('🎯 恢复选中节点:', targetNode.name);
                            setSelectedNode(targetNode);
                            
                            // 如果有保存的父级路径，构建完整路径
                            const savedParentNodes = parsedState.selectedParentNodes || [];
                            const fullPath = [...savedParentNodes, targetNode.name];
                            
                            console.log('🔄 恢复节点路径:', fullPath);
                            console.log('🔄 保存的父级路径:', savedParentNodes);
                            console.log('🔄 目标节点:', targetNode.name);
                            
                            // 直接调用 onNodeSelect，并传递正确的父级路径
                            setTimeout(() => {
                                onNodeSelect(
                                    targetNode, 
                                    parsedState.selectedNodeLevel || fullPath.length, 
                                    savedParentNodes
                                );
                                
                                // 如果节点需要展开到特定位置，触发导航
                                if (fullPath.length > 2) {
                                    // 递归展开父节点
                                    const expandParentNodes = (data, path, index = 0) => {
                                        if (!data || index >= path.length - 1) return;
                                        
                                        if (data.name === path[index]) {
                                            // 确保节点展开
                                            if (data.__rd3t) {
                                                data.__rd3t.collapsed = false;
                                            }
                                            
                                            // 继续展开子节点
                                            if (Array.isArray(data.children)) {
                                                for (const child of data.children) {
                                                    expandParentNodes(child, path, index + 1);
                                                }
                                            }
                                        } else if (Array.isArray(data.children)) {
                                            // 在子节点中查找
                                            for (const child of data.children) {
                                                expandParentNodes(child, path, index);
                                            }
                                        }
                                    };
                                    
                                    // 展开路径上的所有父节点
                                    expandParentNodes(mindMapData, fullPath, 0);
                                }
                            }, 500);
                        }
                    }
                } else {
                    console.log('❌ 未找到保存的状态数据');
                }
                
                // 延迟通知状态恢复完成
                setTimeout(() => {
                    console.log('✅ 状态恢复完成');
                    onStateRestored();
                }, 1000);
                
            } catch (error) {
                console.error('❌ 状态恢复过程中出错:', error);
                onStateRestored();
            }
        }
    }, [shouldRestoreState, mindMapData, subject, onStateRestored, onNodeSelect, findNodeInDataSimple]);

    // 监听强制导航触发器
    useEffect(() => {
        if (forceNavigationTrigger && forceNavigationTrigger.path && forceNavigationTrigger.path.length > 0 && mindMapData) {
            console.log('🧭 开始强制导航到:', forceNavigationTrigger.path);
            
            const targetPath = forceNavigationTrigger.path;
            const targetNodeName = targetPath[targetPath.length - 1];
            
            // 直接查找并选中目标节点
            const targetNode = findNodeInDataSimple(mindMapData, targetNodeName);
            
            if (targetNode && onNodeSelect) {
                console.log('🎯 导航找到目标节点:', targetNodeName);
                setSelectedNode(targetNode);
                
                // 计算父级路径
                const parentPath = targetPath.slice(0, -1).filter(p => p !== subject);
                const nodeLevel = targetPath.length;
                
                // 延迟选中节点
                setTimeout(() => {
                    onNodeSelect(targetNode, nodeLevel, parentPath);
                    console.log('✅ 导航完成，节点已选中');
                    
                    // 通知导航完成
                    if (onNavigationComplete) {
                        onNavigationComplete();
                    }
                }, 300);
            } else {
                console.log('❌ 导航目标节点未找到:', targetNodeName);
                if (onNavigationComplete) {
                    onNavigationComplete();
                }
            }
        }
    }, [forceNavigationTrigger, mindMapData, subject, onNodeSelect, onNavigationComplete, findNodeInDataSimple]);

    // useEffect Hook 用于在组件首次渲染后执行副作用操作，如此处用于获取数据
    useEffect(() => {
        // 定义一个异步函数来获取知识导图数据
        const fetchMindMapData = async () => {
            setIsLoading(true); // 开始获取数据前，设置加载状态为true
            setError(null);     // 清除任何之前的错误信息
            
            // 检查内存缓存
            if (window.mindMapCache && window.mindMapCache[subject]) {
                const memoryCache = window.mindMapCache[subject];
                const now = new Date().getTime();
                const cacheAge = now - memoryCache.timestamp;
                
                // 内存缓存有效期10分钟
                if (cacheAge < 600000) {
                    console.log('使用内存缓存数据');
                    setMindMapData(memoryCache.data);
                    setOriginalData(JSON.parse(JSON.stringify(memoryCache.data)));
                    setTotalNodeCount(countAllNodes(memoryCache.data));
                    setIsLoading(false);
                    return;
                }
            }
            
            // 检查localStorage缓存
            const cachedData = localStorage.getItem(`mindmap-${subject}`);
            const cachedTimestamp = localStorage.getItem(`mindmap-${subject}-timestamp`);
            
            // 如果有缓存且不超过2小时，使用缓存数据
            if (cachedData && cachedTimestamp) {
                const now = new Date().getTime();
                const cacheAge = now - parseInt(cachedTimestamp);
                if (cacheAge < 7200000) { // 2小时 = 7200000毫秒
                    try {
                        const parsedCache = JSON.parse(cachedData);
                        setMindMapData(parsedCache);
                        setOriginalData(JSON.parse(JSON.stringify(parsedCache)));
                        setTotalNodeCount(countAllNodes(parsedCache));
                        setIsLoading(false);
                        
                        // 保存到内存缓存
                        if (!window.mindMapCache) window.mindMapCache = {};
                        window.mindMapCache[subject] = {
                            data: parsedCache,
                            timestamp: now
                        };
                        
                        console.log('使用localStorage缓存数据');
                        
                        // 如果缓存超过30分钟，后台静默更新
                        if (cacheAge > 1800000) {
                            setTimeout(() => fetchFreshData(), 100);
                        }
                        return;
                    } catch (e) {
                        console.error("缓存数据解析失败:", e);
                        // 继续正常加载
                    }
                }
            }
            
            // 正常加载流程
            await fetchFreshData();
        };
        
        // 提取实际获取新数据的函数
        const fetchFreshData = async () => {
            try {
                // 使用fetch API从指定的后端端点获取数据
                const response = await fetch(`/api/mindmaps/${subject}`);

                // 检查HTTP响应状态是否表示成功
                if (!response.ok) {
                    throw new Error(`获取导图数据失败，状态码: ${response.status}`);
                }

                // 将响应体解析为JSON格式
                const data = await response.json();

                // 检查API返回的数据结构是否符合预期
                if (data && data.success && data.mindmap && data.mindmap.map_data) {
                    setMindMapData(data.mindmap.map_data); // 更新状态
                    setOriginalData(JSON.parse(JSON.stringify(data.mindmap.map_data))); // 深拷贝原始数据
                    
                    // 计算总节点数
                    const nodeCount = countAllNodes(data.mindmap.map_data);
                    setTotalNodeCount(nodeCount);
                    
                    // 缓存数据到localStorage和内存
                    try {
                        const now = new Date().getTime();
                        const mapData = data.mindmap.map_data;
                        
                        // localStorage缓存
                        localStorage.setItem(`mindmap-${subject}`, JSON.stringify(mapData));
                        localStorage.setItem(`mindmap-${subject}-timestamp`, now.toString());
                        
                        // 内存缓存
                        if (!window.mindMapCache) window.mindMapCache = {};
                        window.mindMapCache[subject] = {
                            data: mapData,
                            timestamp: now
                        };
                        
                        console.log('数据已缓存到localStorage和内存');
                    } catch (e) {
                        console.warn("无法缓存导图数据:", e);
                    }
                } else {
                    console.error('API返回的数据格式不正确或操作未成功:', data);
                    throw new Error(data.message || 'API返回的数据格式不正确');
                }
            } catch (err) {
                console.error('加载知识导图失败:', err);
                setError(err.message);

                // 使用默认数据作为备用
                setMindMapData(DEFAULT_CIVIL_LAW_DATA);
                setOriginalData(JSON.parse(JSON.stringify(DEFAULT_CIVIL_LAW_DATA))); // 深拷贝原始数据
                
                // 计算默认数据的节点总数
                const nodeCount = countAllNodes(DEFAULT_CIVIL_LAW_DATA);
                setTotalNodeCount(nodeCount);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMindMapData(); // 调用函数开始获取数据
        
        // 清理函数
        return () => {
            // 若有需要取消的异步操作，在这里处理
        };
    }, [subject]);
    
    // 处理搜索功能
    useEffect(() => {
        if (!originalData || !searchTerm) {
            // 如果没有搜索词或原始数据，恢复原始数据显示
            if (originalData) {
                setMindMapData(JSON.parse(JSON.stringify(originalData)));
            }
            return;
        }
        
        // 创建数据的深拷贝，以避免修改原始数据
        const dataCopy = JSON.parse(JSON.stringify(originalData));
        
        // 执行搜索，标记匹配的节点
        searchNodes(dataCopy, searchTerm);
        
        // 更新状态以重新渲染树
        setMindMapData(dataCopy);
        
        // 如果有搜索词，设置需要重新居中状态
        if (searchTerm && treeRef.current) {
            // 重新应用缩放并调整视图位置
            setTimeout(() => {
                if (treeRef.current) {
                    // 应用较小的缩放以便能看到更多节点
                    const searchZoomLevel = 0.35; 
                    setZoomLevel(searchZoomLevel); // 使用状态更新而不是直接调用方法
                    
                    // 手动重新居中
                    const dimensions = treeRef.current.getBoundingClientRect ? 
                        treeRef.current.getBoundingClientRect() : { width: 1000, height: 800 };
                    
                    // 这里我们尝试把树居中到视图中央
                    if (treeRef.current.translate) {
                        treeRef.current.translate({
                            x: dimensions.width / 3,
                            y: dimensions.height / 2
                        });
                    }
                }
            }, 300);
        }
    }, [searchTerm, originalData]);

    // 获取节点层级的函数
    const getNodeLevel = useCallback((nodeDatum) => {
        // 优先使用 __rd3t.depth，这是最可靠的
        if (nodeDatum.__rd3t && typeof nodeDatum.__rd3t.depth === 'number') {
            return nodeDatum.__rd3t.depth;
        }
        // 降级方案：简单估算
        return 0;
    }, []);

    // 处理节点选择的函数
    const handleNodeSelect = useCallback((nodeDatum, event) => {
        event.stopPropagation(); // 阻止事件冒泡到圆圈点击
        
        const nodeLevel = getNodeLevel(nodeDatum);
        
        // 只有第三级及以后且不是叶子节点的节点才能被选中查看详情
        const isLeafNode = !nodeDatum.children || nodeDatum.children.length === 0;
        if (nodeLevel >= 3 && !isLeafNode) {
            setSelectedNode(nodeDatum);
            
            // 构建真实的父级路径 - 通过查找节点在树中的位置
            const parentPath = [];
            
            // 递归查找节点路径的函数
            const findNodePath = (data, targetName, currentPath = []) => {
                // 添加空值检查
                if (!data || !data.name) {
                    return null;
                }
                
                if (data.name === targetName) {
                    return [...currentPath, data.name];
                }
                
                if (Array.isArray(data.children) && data.children.length > 0) {
                    for (const child of data.children) {
                        const path = findNodePath(child, targetName, [...currentPath, data.name]);
                        if (path) {
                            return path;
                        }
                    }
                }
                
                return null;
            };
            
            // 查找完整路径
            const dataToSearch = originalData || mindMapData;
            if (dataToSearch) {
                const fullPath = findNodePath(dataToSearch, nodeDatum.name);
                if (fullPath && fullPath.length > 2) {
                    // 去掉根节点和当前节点，得到父级路径
                    parentPath.push(...fullPath.slice(1, -1));
                }
            } else {
                console.warn('导图数据未加载，使用节点自身的父级信息');
                // 如果没有完整数据，尝试从节点本身获取父级信息
                if (nodeDatum.parent) {
                    let parent = nodeDatum.parent;
                    const tempPath = [];
                    while (parent && parent.data && parent.data.name) {
                        tempPath.unshift(parent.data.name);
                        parent = parent.parent;
                    }
                    // 去掉根节点
                    if (tempPath.length > 0) {
                        parentPath.push(...tempPath.slice(1));
                    }
                }
            }
            
            // 保存当前状态到 localStorage
            try {
                const currentState = {
                    selectedNode: {
                        name: nodeDatum.name,
                        data: nodeDatum
                    },
                    selectedNodeLevel: nodeLevel,
                    selectedParentNodes: parentPath,
                    searchTerm: searchTerm,
                    zoomLevel: zoomLevel,
                    timestamp: Date.now()
                };
                
                const stateKey = `mindmap_state_${subject}`;
                localStorage.setItem(stateKey, JSON.stringify(currentState));
                console.log('💾 节点状态已保存:', nodeDatum.name);
            } catch (error) {
                console.error('❌ 保存状态失败:', error);
            }
            
            // 通知父组件节点被选中
            if (onNodeSelect) {
                onNodeSelect(nodeDatum, nodeLevel, parentPath);
            }
        }
    }, [onNodeSelect, getNodeLevel, subject, searchTerm, zoomLevel]);

    // 优化的自定义节点组件，使用useCallback减少重新渲染
    const renderCustomNodeElement = useCallback(({ nodeDatum, toggleNode }) => {
        // 正确检测折叠的子节点
        const collapsed = nodeDatum.__rd3t && nodeDatum.__rd3t.collapsed;
        
        // 获取节点的原始子节点数量（无论是否折叠）
        let hiddenChildrenCount = 0;
        
        // 判断是否有子节点，以及有多少子节点被隐藏
        if (collapsed) {
            hiddenChildrenCount = (nodeDatum.children || []).length;
        }

        // 计算文本框宽度 - 更精确的方式
        const getTextWidth = (text) => {
            let width = 0;
            for (let i = 0; i < text.length; i++) {
                // Unicode范围大致判断是否为中文字符
                if (/[\u4e00-\u9fa5]/.test(text[i])) {
                    width += 22;  // 增大中文字符宽度
                } else {
                    width += 14;  // 增大英文字符宽度
                }
            }
            return width + 30;  // 添加更多边距
        };

        // 获取节点显示文本
        const displayText = getNodeDisplayName(nodeDatum);
        const textWidth = getTextWidth(displayText);
        
        // 检查节点是否匹配搜索条件
        const isMatch = nodeDatum.searchMatch;
        const isPathToMatch = nodeDatum.pathToMatch;
        
        // 获取节点层级
        const nodeLevel = getNodeLevel(nodeDatum);
        
        // 判断是否可以点击查看详情（第三级及以后，但不是叶子节点）
        const isLeafNode = !nodeDatum.children || nodeDatum.children.length === 0;
        const canShowDetails = nodeLevel >= 3 && !isLeafNode;
        
        // 判断是否为当前选中的节点
        const isSelected = selectedNode && selectedNode.name === nodeDatum.name;

        // 节点样式，可以根据需要调整
        const nodeStyles = {
            circle: {
                r: hiddenChildrenCount > 0 ? 20 : 18, // 增大圆圈尺寸
                fill: isMatch ? '#FF6B6B' : isPathToMatch ? '#FFD166' : '#4299E1', // 匹配时使用红色，路径节点使用黄色
                stroke: isMatch ? '#E53E3E' : isPathToMatch ? '#ECC94B' : '#2B6CB0', // 匹配边框颜色
                strokeWidth: isMatch || isPathToMatch ? '3px' : '2px', // 匹配时加粗边框
                cursor: 'pointer',
            },
            nameText: {
                fontSize: '19px', // 进一步增大字体
                fontFamily: '"SimSun", "宋体", serif', // 使用宋体
                fontWeight: 'normal', // 移除条件加粗，所有节点都使用normal
                fill: isMatch ? '#E53E3E' : '#000000', // 匹配时使用红色文字
                x: 30, // 增加与圆圈的距离
                y: 0,
                textAnchor: 'start',
                alignmentBaseline: 'middle',
                textRendering: 'geometricPrecision', // 提高字体渲染精度
                letterSpacing: '0.5px', // 增加字间距
            },
            childCountText: {
                fontSize: '14px', // 增大数字大小
                fill: 'white',
                fontWeight: 'bold',
                textAnchor: 'middle',
                alignmentBaseline: 'middle',
            },
            rect: {
                fill: isSelected ? '#fef3c7' : (isMatch ? 'rgba(255, 235, 235, 1)' : isPathToMatch ? 'rgba(255, 250, 230, 1)' : (canShowDetails ? '#f3f4f6' : '#f9fafb')),
                stroke: isSelected ? '#f59e0b' : (isMatch ? '#FC8181' : isPathToMatch ? '#F6E05E' : (canShowDetails ? '#d1d5db' : '#e5e7eb')),
                strokeWidth: isSelected ? 2 : (isMatch || isPathToMatch ? 2 : 1.5),
                cursor: canShowDetails ? 'pointer' : 'default'
            }
        };

        return (
            <g>
                {/* 节点圆圈 - 用于展开/折叠 */}
                <circle 
                    {...nodeStyles.circle} 
                    onClick={toggleNode}
                />
                
                {/* 显示子节点数量在圆圈内 */}
                {hiddenChildrenCount > 0 && (
                    <text
                        x="0"
                        y="1"
                        style={nodeStyles.childCountText}
                        dominantBaseline="middle"
                        textAnchor="middle"
                        onClick={toggleNode}
                        style={{ ...nodeStyles.childCountText, pointerEvents: 'none' }}
                    >
                        {hiddenChildrenCount}
                    </text>
                )}
                
                {/* 节点文本框 - 用于选择节点查看详情 */}
                {displayText && (
                    <rect
                        x={nodeStyles.nameText.x - 8}
                        y={-14}
                        width={textWidth}
                        height={28}
                        fill={nodeStyles.rect.fill}
                        fillOpacity="1"
                        rx={5}
                        ry={5}
                        stroke={nodeStyles.rect.stroke}
                        strokeWidth={nodeStyles.rect.strokeWidth}
                        style={{ cursor: nodeStyles.rect.cursor }}
                        onClick={canShowDetails ? (event) => handleNodeSelect(nodeDatum, event) : undefined}
                    />
                )}
                
                {/* 节点文本 */}
                <text 
                    {...nodeStyles.nameText}
                    dominantBaseline="middle"
                    paintOrder="stroke fill"
                    style={{ 
                        ...nodeStyles.nameText, 
                        pointerEvents: 'none',
                        userSelect: 'none'
                    }}
                >
                    {displayText}
                </text>
                
                {/* 详情图标（只在可查看详情的节点上显示） */}
                {canShowDetails && (
                    <text
                        x={nodeStyles.nameText.x + textWidth - 5}
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="10"
                        fill="#6b7280"
                        style={{ pointerEvents: 'none' }}
                    >
                        📖
                    </text>
                )}
            </g>
        );
    }, [searchTerm, selectedNode, getNodeLevel, handleNodeSelect]); // 更新依赖数组
    
    // 使用useMemo优化Tree组件的props
    const treeProps = useMemo(() => ({
        data: mindMapData,
        orientation: "horizontal",
        pathFunc: "bezier",
        initialDepth: 3,
        translate: { x: 150, y: 300 },
        zoomable: true,
        separation: { siblings: 1.2, nonSiblings: 2.5 },
        nodeSize: { x: 400, y: 120 },
        renderCustomNodeElement,
        depthFactor: 500,
        centeringTransitionDuration: 600,
        shouldCollapseNeighborNodes: false,
        zoom: zoomLevel,
        scaleExtent: { min: 0.1, max: 3 },
        enableLegacyTransitions: false,
        transitionDuration: 200,
        collapsible: true,
        pathClassFunc: () => 'mind-map-path'
    }), [mindMapData, zoomLevel, renderCustomNodeElement]);

    // --- UI渲染逻辑 ---

    // 如果正在加载数据，显示加载提示
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-10 space-y-4">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="text-gray-600">正在加载知识导图...</div>
                <div className="text-sm text-gray-400">首次加载可能需要几秒钟</div>
            </div>
        );
    }

    // 如果加载过程中发生错误，显示错误信息
    if (error) {
        return <div className="flex justify-center p-10">加载知识导图失败: {error}</div>;
    }

    // 如果数据不存在（例如，初始状态，或API没有返回有效数据且没有错误）
    if (!mindMapData) {
        return <div className="flex justify-center p-10">没有可显示的知识导图数据。</div>;
    }

    // 如果数据加载成功，渲染Tree组件
    return (
        <div className="w-full h-full border border-gray-200 rounded-md relative">
            {/* 如果有错误，显示一个顶部通知栏 */}
            {error && (
                <div className="absolute top-0 left-0 right-0 bg-amber-100 text-amber-800 p-2 text-center text-sm z-10">
                    无法从服务器加载最新知识导图，显示的是离线备用数据。
                </div>
            )}
            
            {/* 如果有搜索匹配项，显示提示 */}
            {searchTerm && (
                <div className="absolute top-2 left-2 right-2 bg-blue-100 text-blue-800 p-2 text-center text-sm z-10 rounded-md">
                    正在搜索: {searchTerm.includes(',') 
                        ? searchTerm.split(',').map(term => term.trim()).filter(term => term).map((term, index, arr) => (
                            <span key={term}>
                                "{term}"{index < arr.length - 1 ? '、' : ''}
                            </span>
                          ))
                        : `"${searchTerm}"`
                    } - 匹配项以红色显示，匹配项路径以黄色显示
                </div>
            )}
            
            {/* 添加预加载字体以确保字体正确渲染 */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @font-face {
                    font-family: 'SimSun';
                    font-display: swap;
                    src: local('SimSun');
                    font-weight: normal;
                    font-style: normal;
                }
                
                @font-face {
                    font-family: '宋体';
                    font-display: swap;
                    src: local('宋体');
                    font-weight: normal;
                    font-style: normal;
                }
                
                .mind-map-path {
                    stroke: #94a3b8;
                    stroke-width: 1.5px;
                    fill: none;
                }
                
                /* 提高SVG文本渲染质量 */
                svg text {
                    shape-rendering: geometricPrecision;
                    text-rendering: geometricPrecision;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                }
                `
            }} />
            
            <Tree
                ref={treeRef}
                {...treeProps}
            />
        </div>
    );
};

// 使用React.memo优化组件，只在props真正变化时重新渲染
export default React.memo(MindMapViewer, (prevProps, nextProps) => {
  return (
    prevProps.subject === nextProps.subject &&
    prevProps.customZoom === nextProps.customZoom &&
    prevProps.searchTerm === nextProps.searchTerm &&
    prevProps.shouldRestoreState === nextProps.shouldRestoreState &&
    JSON.stringify(prevProps.forceNavigationTrigger) === JSON.stringify(nextProps.forceNavigationTrigger)
  );
}); 