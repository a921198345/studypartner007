# SaveNoteButton 和 MindMapButton 可见性修复

## 问题描述

在 AI 聊天界面中，SaveNoteButton（保存为笔记）和 MindMapButton（查看导图）按钮可能不够明显或难以看见。

## 问题原因

1. **Ghost 变体样式过于微妙**：按钮使用了 `variant="ghost"`，这种样式在某些背景下可能几乎不可见
2. **缺少明确的边框和颜色**：Ghost 按钮默认没有边框，文本颜色可能与背景对比度不足
3. **悬停效果不明显**：默认的 hover 效果可能过于微妙

## 解决方案

为两个按钮添加了更明显的样式：

### 1. SaveNoteButton.tsx 修改

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => setOpen(true)}
  className="text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200"
>
  <BookmarkPlus className="h-3 w-3 mr-1" />
  保存为笔记
</Button>
```

### 2. MindMapButton.tsx 修改

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={handleNavigateToMindMap}
  disabled={isProcessing}
  className="text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200"
>
  <Brain className="h-3 w-3 mr-1" />
  {isProcessing ? '处理中...' : '查看导图'}
</Button>
```

## 改进内容

1. **添加边框**：`border border-gray-200` 提供清晰的视觉边界
2. **明确的文本颜色**：`text-gray-600` 确保足够的对比度
3. **改进的悬停效果**：
   - `hover:text-gray-900` 悬停时文本变深
   - `hover:bg-gray-100` 悬停时背景变亮
4. **保持一致性**：仍然使用 ghost 变体，但通过 className 增强可见性

## 测试文件

创建了两个测试文件来验证按钮可见性：
- `test-button-visibility.html` - 基础可见性测试
- `test-ai-chat-buttons.html` - 完整的 AI 聊天界面按钮测试

## 其他注意事项

1. 按钮只在以下条件下显示：
   - 必须是 AI 消息（assistant role）
   - 必须有内容
   - 不能是欢迎消息
   - 流式传输必须已完成

2. 按钮位置：
   - 使用 `ml-14` 与消息内容对齐
   - 位于消息内容下方
   - 两个按钮之间有 `gap-2` 间距

## 效果对比

- **修改前**：按钮几乎透明，很难注意到
- **修改后**：按钮有清晰的边框和颜色，易于识别和点击