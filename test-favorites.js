// 测试收藏功能的脚本

// 检查本地存储中的收藏题目
const favoriteIds = localStorage.getItem('favoriteQuestions');
console.log('本地收藏题目ID列表:', favoriteIds);

if (favoriteIds) {
  const ids = JSON.parse(favoriteIds);
  console.log('收藏题目数量:', ids.length);
  console.log('收藏题目ID:', ids);
}

// 检查缓存的收藏题目列表
const cachedFavorites = localStorage.getItem('cachedFavorites');
if (cachedFavorites) {
  const cached = JSON.parse(cachedFavorites);
  console.log('缓存的收藏题目数据:', cached);
}

// 检查缓存的题目数据
const cachedQuestions = localStorage.getItem('cachedQuestions');
if (cachedQuestions) {
  const cached = JSON.parse(cachedQuestions);
  console.log('缓存的题目列表数据存在，题目数:', cached.data?.data?.questions?.length || 0);
}

// 测试添加一些收藏题目
if (!favoriteIds || JSON.parse(favoriteIds).length === 0) {
  console.log('添加测试收藏题目...');
  localStorage.setItem('favoriteQuestions', JSON.stringify([1, 2, 3, 4, 5, 6]));
  console.log('已添加6个测试收藏题目');
}