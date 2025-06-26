# 修复年份筛选显示问题

## 问题描述
- 点击2020年后，API正确返回63条记录
- 但页面显示"共 1865 道题目"（全部题目）
- 控制台日志显示有两个API请求：一个带年份参数，一个不带

## 问题原因分析
1. **初始状态问题**：`selectedYears` 初始值是 `["all"]`
2. **多次渲染问题**：可能在状态更新过程中触发了多次API请求
3. **状态同步问题**：显示的是旧状态下的请求结果

## 建议的修复方案

### 方案1：添加请求标识防止竞态条件
```javascript
// 在组件中添加
const requestIdRef = useRef(0);

// 在fetchQuestions中
const fetchQuestions = async () => {
  const currentRequestId = ++requestIdRef.current;
  
  try {
    // ... 发起请求
    
    // 在设置数据前检查是否是最新请求
    if (currentRequestId !== requestIdRef.current) {
      console.log('忽略过期的请求结果');
      return;
    }
    
    // 设置数据...
  } catch (error) {
    // 错误处理
  }
};
```

### 方案2：确保初始加载不会触发多次请求
```javascript
// 使用更严格的依赖检查
useEffect(() => {
  if (!isInitialized) return;
  
  fetchQuestions();
}, [selectedYears, selectedSubject, /* 其他依赖 */]);
```

## 临时解决方案

在浏览器控制台运行：
```javascript
// 1. 查看当前状态
const checkboxes = document.querySelectorAll('input[type="checkbox"]');
checkboxes.forEach(cb => {
  const label = cb.parentElement.querySelector('span');
  if (label) {
    console.log(label.textContent, ':', cb.checked);
  }
});

// 2. 手动触发正确的筛选
// 先取消"全部年份"
const allCheckbox = Array.from(checkboxes).find(cb => 
  cb.parentElement.querySelector('span')?.textContent === '全部年份'
);
if (allCheckbox && allCheckbox.checked) {
  allCheckbox.click();
}

// 然后选择2020年
setTimeout(() => {
  const year2020Checkbox = Array.from(checkboxes).find(cb => 
    cb.parentElement.querySelector('span')?.textContent === '2020年'
  );
  if (year2020Checkbox && !year2020Checkbox.checked) {
    year2020Checkbox.click();
  }
}, 100);
```

## 验证修复
1. 刷新页面
2. 查看控制台日志中的"handleYearChange 被调用"和"年份选择更新"
3. 确认selectedYears从["all"]变为["2020"]
4. 确认只有一个API请求发出，且year参数为["2020"]
5. 确认页面显示"共 63 道题目"