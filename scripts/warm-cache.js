   // scripts/warm-cache.js
   const db = require('../db');
   const cache = require('../lib/cache');

   // 加载表结构信息
   async function getTableInfo() {
     try {
       // 尝试获取表结构信息
       const columnsInfo = await db.query('SHOW COLUMNS FROM mind_maps');
       
       // 检查是否有subject或subject_name列
       const hasSubjectColumn = columnsInfo.some(col => col.Field === 'subject');
       const hasSubjectNameColumn = columnsInfo.some(col => col.Field === 'subject_name');
       
       // 检查是否有content或map_data列
       const hasContentColumn = columnsInfo.some(col => col.Field === 'content');
       const hasMapDataColumn = columnsInfo.some(col => col.Field === 'map_data');
       
       // 确定使用的列名
       const subjectColumnName = hasSubjectNameColumn ? 'subject_name' : 
                                (hasSubjectColumn ? 'subject' : 'subject_name');
       
       const contentColumnName = hasMapDataColumn ? 'map_data' : 
                                (hasContentColumn ? 'content' : 'map_data');
       
       console.log(`检测到表结构: 学科列=${subjectColumnName}, 内容列=${contentColumnName}`);
       
       return {
         subjectColumnName,
         contentColumnName
       };
     } catch (error) {
       console.error('获取表结构失败，使用默认值:', error.message);
       // 返回默认值
       return {
         subjectColumnName: 'subject_name',
         contentColumnName: 'map_data'
       };
     }
   }

   // 定义知识导图数据格式化函数
   function formatMindmapData(data, contentColumnName) {
     // 检查数据是否为空
     if (!data || data.length === 0) {
       return { success: false, error: "未找到知识导图数据" };
     }
     
     try {
       // 获取第一条记录
       const mindmapEntry = data[0];
       
       // 检查内容字段是否存在
       if (!mindmapEntry[contentColumnName]) {
         console.error(`知识导图数据格式错误，缺少${contentColumnName}字段`);
         return { success: false, error: "知识导图数据格式错误" };
       }
       
       // 如果内容已经是对象，直接使用
       // 如果是字符串，需要解析为对象
       let mindmapContent = mindmapEntry[contentColumnName];
       if (typeof mindmapContent === 'string') {
         try {
           mindmapContent = JSON.parse(mindmapContent);
         } catch (e) {
           console.error('解析知识导图JSON数据失败:', e);
           return { success: false, error: "知识导图数据格式错误" };
         }
       }
       
       // 包装成前端期望的格式，与API返回格式保持一致
       return { 
         success: true, 
         mindmap: {
           map_data: mindmapContent
         }
       };
     } catch (error) {
       console.error('格式化知识导图数据时出错:', error);
       return { success: false, error: "处理知识导图数据时出错" };
     }
   }

   // 预热缓存的函数
   async function warmupCache() {
     try {
       console.log('开始预热知识导图缓存...');
       
       // 获取表结构信息
       const { subjectColumnName, contentColumnName } = await getTableInfo();
       
       // 所有学科列表
       const subjects = ['民法', '刑法', '宪法', '民诉', '刑诉', '行政法', '商法', '法理学'];
       
       // 循环处理每个学科
       for (const subject of subjects) {
         try {
           console.log(`正在加载 ${subject} 知识导图...`);
           
           // 从数据库获取知识导图
           const mindmapData = await db.query(
             `SELECT * FROM mind_maps WHERE ${subjectColumnName} = ?`,
             [subject]
           );
           
           // 处理数据
           const formattedData = formatMindmapData(mindmapData, contentColumnName);
           
           // 保存到缓存(缓存24小时)
           if (formattedData.success) {
             await cache.set(`mindmap:${subject}`, formattedData, 86400);
             console.log(`✅ ${subject} 知识导图已加入缓存`);
           } else {
             console.log(`❌ ${subject} 知识导图加载失败: ${formattedData.error}`);
           }
         } catch (subjectError) {
           console.error(`处理 ${subject} 知识导图时出错:`, subjectError.message);
           // 继续处理下一个学科
           continue;
         }
       }
       
       console.log('缓存预热完成!');
       return { success: true };
     } catch (error) {
       console.error('缓存预热失败:', error.message);
       // 失败不影响应用运行
       return { success: false, error: error.message };
     }
   }

   // 导出但不立即执行，由next.config.mjs控制调用
   module.exports = warmupCache;