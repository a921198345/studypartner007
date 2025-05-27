   // scripts/warm-cache.js
   const db = require('../db');
   const cache = require('../lib/cache');

   // 预热缓存的函数
   async function warmupCache() {
     try {
       console.log('开始预热知识导图缓存...');
       
       // 所有学科列表
       const subjects = ['民法', '刑法', '宪法', '民诉', '刑诉', '行政法', '商法', '法理学'];
       
       // 循环处理每个学科
       for (const subject of subjects) {
         console.log(`正在加载 ${subject} 知识导图...`);
         
         // 从数据库获取知识导图
         const mindmapData = await db.query(
           'SELECT * FROM mindmaps WHERE subject = ?',
           [subject]
         );
         
         // 处理数据
         const formattedData = formatMindmapData(mindmapData);
         
         // 保存到缓存(缓存24小时)
         await cache.set(`mindmap:${subject}`, formattedData, 86400);
         
         console.log(`✅ ${subject} 知识导图已加入缓存`);
       }
       
       console.log('🎉 所有知识导图缓存预热完成!');
     } catch (error) {
       console.error('缓存预热失败:', error);
     }
   }

   // 执行缓存预热
   warmupCache();