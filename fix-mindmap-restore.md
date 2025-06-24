# 知识导图状态恢复问题修复方案

## 问题诊断

### 根本原因
1. **时序冲突**：在 react-d3-tree 完全初始化之前就设置了展开状态，导致状态被覆盖
2. **状态管理混乱**：expandedNodesMap 和 __rd3t.collapsed 两套状态系统不同步
3. **组件重建时机不当**：componentKey 更新导致已设置的状态丢失

### 关键代码位置
- `handleDataWithStateRestore` 函数（第 606-702 行）：过早设置展开状态
- Tree 组件渲染（第 1371-1376 行）：缺少渲染完成回调

## 修复方案

### 方案一：延迟应用展开状态（推荐）

```javascript
// 在 handleDataWithStateRestore 函数中修改
const handleDataWithStateRestore = useCallback((data) => {
    try {
        const stateKey = `mindMapViewState_${subject}`;
        const savedState = sessionStorage.getItem(stateKey);
        
        if (savedState && shouldRestoreState) {
            const state = JSON.parse(savedState);
            console.log('🔄 准备恢复知识导图状态');
            
            // 深拷贝数据
            const dataCopy = JSON.parse(JSON.stringify(data));
            
            // 先设置基础数据，但不设置展开状态
            setMindMapData(dataCopy);
            setOriginalData(JSON.parse(JSON.stringify(dataCopy)));
            
            // 恢复其他状态
            if (state.zoomLevel) {
                setZoomLevel(state.zoomLevel);
            }
            
            // 保存需要恢复的状态，等待树渲染完成
            const pendingRestore = {
                expandedNodes: state.expandedNodes,
                selectedNode: state.selectedNode,
                transform: state.transform
            };
            
            // 使用多重延迟确保 react-d3-tree 完全初始化
            setTimeout(() => {
                // 第一步：等待 react-d3-tree 初始渲染
                requestAnimationFrame(() => {
                    // 第二步：在下一帧应用展开状态
                    setTimeout(() => {
                        // 应用展开状态
                        applyExpandedStates(dataCopy, pendingRestore.expandedNodes);
                        
                        // 强制重新渲染
                        setMindMapData({...dataCopy, _restored: Date.now()});
                        
                        // 恢复选中节点和视图
                        if (pendingRestore.selectedNode) {
                            setSelectedNode(pendingRestore.selectedNode);
                            if (onNodeSelect) {
                                const nodeInData = findNodeInData(dataCopy, pendingRestore.selectedNode.name);
                                if (nodeInData) {
                                    onNodeSelect(nodeInData, pendingRestore.selectedNode.__rd3t?.depth || 3, pendingRestore.selectedNode.parentPath || []);
                                }
                            }
                        }
                        
                        if (pendingRestore.transform) {
                            setTreeViewState(pendingRestore);
                            setShouldApplyViewState(true);
                        }
                        
                        // 通知恢复完成
                        if (onStateRestored) {
                            onStateRestored();
                        }
                    }, 500); // 给 react-d3-tree 足够时间完成初始化
                });
            }, 100);
        } else {
            // 正常设置数据
            setMindMapData(data);
            setOriginalData(JSON.parse(JSON.stringify(data)));
        }
    } catch (error) {
        console.error('恢复状态失败:', error);
        setMindMapData(data);
        setOriginalData(JSON.parse(JSON.stringify(data)));
    }
}, [subject, shouldRestoreState, onNodeSelect, onStateRestored]);

// 新增：应用展开状态的辅助函数
const applyExpandedStates = (data, expandedPaths) => {
    if (!expandedPaths || expandedPaths.length === 0) return;
    
    const expandedSet = new Set(expandedPaths.map(path => path.join('->')));
    
    const applyToNode = (node, currentPath = []) => {
        const nodePath = [...currentPath, node.name];
        const pathKey = nodePath.join('->');
        
        // 初始化 __rd3t 如果不存在
        if (!node.__rd3t) {
            node.__rd3t = {
                id: `node-${Math.random().toString(36).substr(2, 9)}`,
                depth: currentPath.length,
                collapsed: true
            };
        }
        
        // 根据保存的状态设置展开
        if (expandedSet.has(pathKey) && node.children && node.children.length > 0) {
            node.__rd3t.collapsed = false;
            console.log(`✅ 恢复展开状态: ${node.name}`);
        }
        
        // 递归处理子节点
        if (node.children) {
            node.children.forEach(child => applyToNode(child, nodePath));
        }
    };
    
    applyToNode(data);
};
```

### 方案二：使用 react-d3-tree 的 onUpdate 回调

```javascript
// 在 Tree 组件中添加 onUpdate 回调
const [treeReady, setTreeReady] = useState(false);
const [pendingRestore, setPendingRestore] = useState(null);

// 修改 treeProps
const treeProps = useMemo(() => ({
    // ... 其他属性
    onUpdate: () => {
        if (!treeReady) {
            setTreeReady(true);
            console.log('🌳 react-d3-tree 已准备就绪');
            
            // 如果有待恢复的状态，现在应用
            if (pendingRestore) {
                applyPendingRestore();
            }
        }
    }
}), [mindMapData, zoomLevel, renderCustomNodeElement, treeReady, pendingRestore]);
```

### 方案三：使用 MutationObserver 监听 DOM 变化

```javascript
// 在组件中添加 DOM 监听
useEffect(() => {
    if (!treeRef.current || !shouldRestoreState) return;
    
    const observer = new MutationObserver((mutations) => {
        // 检查是否有新的节点被添加
        const hasNewNodes = mutations.some(mutation => 
            Array.from(mutation.addedNodes).some(node => 
                node.nodeName === 'g' || node.nodeName === 'circle'
            )
        );
        
        if (hasNewNodes && !hasAppliedRestore.current) {
            hasAppliedRestore.current = true;
            console.log('🔍 检测到树节点渲染完成，应用恢复状态');
            applyRestoredState();
        }
    });
    
    observer.observe(treeRef.current, {
        childList: true,
        subtree: true
    });
    
    return () => observer.disconnect();
}, [shouldRestoreState]);
```

## 推荐实施步骤

1. **先实施方案一**（延迟应用展开状态）- 最简单且可靠
2. 如果方案一不够稳定，再结合方案二或方案三
3. 添加状态验证机制，确保恢复成功

## 测试验证

1. 在 AI 聊天页面选择一个深层节点
2. 点击"查看导图"跳转
3. 验证：
   - 选中的节点是否高亮显示
   - 父级路径是否全部展开
   - 视图是否正确定位到选中节点

## 其他优化建议

1. **添加加载指示器**：在状态恢复期间显示"正在恢复视图..."
2. **失败重试机制**：如果首次恢复失败，自动重试
3. **状态版本控制**：确保保存和恢复的状态格式兼容
4. **性能优化**：对于大型树，考虑分批应用展开状态