import React, { useState, useEffect, useRef } from 'react';
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

// 递归搜索节点，为匹配项添加searchMatch属性
const searchNodes = (node, searchTerm) => {
  if (!node || !searchTerm) return false;
  
  // 将搜索词和节点名称转换为小写以进行不区分大小写的比较
  const searchTermLower = searchTerm.toLowerCase();
  const nodeName = (node.name || '').toLowerCase();
  
  // 检查当前节点是否匹配
  const isMatch = nodeName.includes(searchTermLower);
  
  // 设置当前节点的searchMatch属性
  node.searchMatch = isMatch;
  
  // 递归搜索子节点
  let hasMatchingChild = false;
  if (node.children && node.children.length > 0) {
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

// 这是一个基础的MindMapViewer组件
// 它会尝试从 /api/mindmaps/民法 获取数据并使用 react-d3-tree 展示
const MindMapViewer = ({ subject = '民法', customZoom = 0.45, searchTerm = '' }) => {
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

    // 处理自定义缩放级别变化
    useEffect(() => {
        // 当customZoom改变且树引用存在时，应用新的缩放级别
        if (customZoom !== null && treeRef.current) {
            treeRef.current.zoom(customZoom);
        }
    }, [customZoom]);

    // useEffect Hook 用于在组件首次渲染后执行副作用操作，如此处用于获取数据
    useEffect(() => {
        // 定义一个异步函数来获取知识导图数据
        const fetchMindMapData = async () => {
            setIsLoading(true); // 开始获取数据前，设置加载状态为true
            setError(null);     // 清除任何之前的错误信息
            
            // 检查是否有缓存数据
            const cachedData = localStorage.getItem(`mindmap-${subject}`);
            const cachedTimestamp = localStorage.getItem(`mindmap-${subject}-timestamp`);
            
            // 如果有缓存且不超过30分钟，先使用缓存数据快速渲染
            if (cachedData && cachedTimestamp) {
                const now = new Date().getTime();
                const cacheAge = now - parseInt(cachedTimestamp);
                if (cacheAge < 1800000) { // 30分钟 = 1800000毫秒
                    try {
                        const parsedCache = JSON.parse(cachedData);
                        setMindMapData(parsedCache);
                        setOriginalData(JSON.parse(JSON.stringify(parsedCache))); // 深拷贝
                        setIsLoading(false);
                        
                        // 后台仍然加载新数据，但用户已经可以看到缓存的内容
                        setTimeout(() => fetchFreshData(), 100);
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
                    
                    // 缓存数据
                    try {
                        localStorage.setItem(`mindmap-${subject}`, JSON.stringify(data.mindmap.map_data));
                        localStorage.setItem(`mindmap-${subject}-timestamp`, new Date().getTime().toString());
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
                if (treeRef.current && treeRef.current.zoom) {
                    // 应用较小的缩放以便能看到更多节点
                    const searchZoomLevel = 0.35; 
                    treeRef.current.zoom(searchZoomLevel);
                    
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

    // 自定义节点组件
    const renderCustomNodeElement = ({ nodeDatum, toggleNode }) => {
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

        const textWidth = getTextWidth(nodeDatum.name || '');
        
        // 检查节点是否匹配搜索条件
        const isMatch = nodeDatum.searchMatch;
        const isPathToMatch = nodeDatum.pathToMatch;

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
                fontWeight: isMatch ? 'bold' : 'normal', // 匹配时加粗
                fill: isMatch ? '#E53E3E' : '#000000', // 匹配时使用红色文字
                x: 30, // 增加与圆圈的距离
                y: 0,
                textAnchor: 'start',
                alignmentBaseline: 'middle',
                textRendering: 'geometricPrecision', // 提高字体渲染精度
                letterSpacing: '0.5px', // 增加字间距
                textShadow: '0px 1px 2px white, 0px -1px 2px white, 1px 0px 2px white, -1px 0px 2px white',
            },
            childCountText: {
                fontSize: '14px', // 增大数字大小
                fill: 'white',
                fontWeight: 'bold',
                textAnchor: 'middle',
                alignmentBaseline: 'middle',
            },
            rect: {
                fill: isMatch ? 'rgba(255, 235, 235, 1)' : isPathToMatch ? 'rgba(255, 250, 230, 1)' : 'white',
                stroke: isMatch ? '#FC8181' : isPathToMatch ? '#F6E05E' : '#cbd5e0',
                strokeWidth: isMatch || isPathToMatch ? 2 : 1.5,
            }
        };

        return (
            <g onClick={toggleNode} style={{ cursor: 'pointer' }}>
                {/* 增加白色背景的不透明度，提高文字可见性 */}
                {nodeDatum.name && (
                    <rect
                        x={nodeStyles.nameText.x - 8} // 增加左侧边距
                        y={-14} // 增加上下边距
                        width={textWidth}
                        height={28} // 增加高度
                        fill={nodeStyles.rect.fill}
                        fillOpacity="1"
                        rx={5}
                        ry={5}
                        stroke={nodeStyles.rect.stroke} // 更明显的边框颜色
                        strokeWidth={nodeStyles.rect.strokeWidth} // 调整边框宽度
                    />
                )}
                
                <circle {...nodeStyles.circle} />
                
                {/* 显示子节点数量在圆圈内 */}
                {hiddenChildrenCount > 0 && (
                    <text
                        x="0"
                        y="1"
                        style={nodeStyles.childCountText}
                        dominantBaseline="middle" // 确保文字垂直居中
                        textAnchor="middle" // 确保文字水平居中
                    >
                        {hiddenChildrenCount}
                    </text>
                )}
                
                {/* 增加SVG文本可访问性属性 */}
                <text 
                    {...nodeStyles.nameText}
                    dominantBaseline="middle"
                    paintOrder="stroke fill" // 先绘制描边再填充，提高清晰度
                >
                    {nodeDatum.name}
                </text>
            </g>
        );
    };

    // --- UI渲染逻辑 ---

    // 如果正在加载数据，显示加载提示
    if (isLoading) {
        return <div className="flex justify-center p-10">正在加载知识导图...</div>;
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
                    正在搜索: "{searchTerm}" - 匹配项以红色显示，匹配项路径以黄色显示
                </div>
            )}
            
            {/* 添加预加载字体以确保字体正确渲染 */}
            <style jsx global>{`
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
            `}</style>
            
            <Tree
                ref={treeRef}
                data={mindMapData}
                orientation="horizontal"
                pathFunc="bezier"
                initialDepth={3}
                translate={{ x: 150, y: 300 }}
                zoomable={true}
                separation={{ siblings: 1.3, nonSiblings: 2.8 }}
                nodeSize={{ x: 440, y: 140 }}
                renderCustomNodeElement={renderCustomNodeElement}
                depthFactor={600}
                centeringTransitionDuration={800}
                shouldCollapseNeighborNodes={true}
                zoom={customZoom} // 使用传入的缩放级别
                scaleExtent={{ min: 0.1, max: 3 }}
                enableLegacyTransitions={true}
                transitionDuration={300}
                collapsible={true}
                pathClassFunc={() => 'mind-map-path'}
            />
        </div>
    );
};

export default MindMapViewer; 