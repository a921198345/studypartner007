/**
 * 数据库连接模块 - 根目录导出
 * 
 * 从lib/db重新导出所有功能
 */

export * from './lib/db';

// 导入并重新导出默认导出
import dbDefault from './lib/db';
export default dbDefault;

 