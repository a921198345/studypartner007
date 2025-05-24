/**
 * OPML到JSON树结构的解析工具
 * 将OPML文件内容解析为预定义的树状JSON结构
 */

const xml2js = require('xml2js');

/**
 * 解析OPML字符串为JSON树结构
 * @param {string} opmlContent - OPML文件内容
 * @returns {Promise<Object>} - 解析后的JSON树结构
 */
async function parseOpmlToJsonTree(opmlContent) {
  try {
    // 创建解析器
    const parser = new xml2js.Parser({ explicitArray: false });
    
    // 解析XML
    const result = await parser.parseStringPromise(opmlContent);
    
    // 检查是否有效的OPML格式
    if (!result.opml || !result.opml.body || !result.opml.body.outline) {
      throw new Error('无效的OPML格式');
    }
    
    // 处理根节点
    let rootNode = processNode(result.opml.body.outline);
    
    // 如果根节点是数组, 创建一个虚拟根节点包含它们
    if (Array.isArray(rootNode)) {
      rootNode = {
        name: result.opml.head?.title || '知识导图',
        attributes: {},
        children: rootNode
      };
    }
    
    return rootNode;
  } catch (error) {
    console.error('解析OPML失败:', error);
    throw error;
  }
}

/**
 * 处理OPML节点并转换为所需的JSON格式
 * @param {Object|Array} node - OPML节点
 * @returns {Object|Array} - 转换后的JSON节点
 */
function processNode(node) {
  // 如果是节点数组
  if (Array.isArray(node)) {
    return node.map(item => processNode(item));
  }
  
  // 创建节点结构
  const jsonNode = {
    name: node.text || node._,  // 优先使用text属性作为名称
    attributes: {},
    children: []
  };
  
  // 处理节点属性
  for (const key in node.$) {
    if (key !== 'text') {  // text已作为name处理
      jsonNode.attributes[key] = node.$[key];
    }
  }
  
  // 将其他非特殊属性添加到attributes
  for (const key in node) {
    if (key !== '_' && key !== 'text' && key !== '$' && key !== 'outline') {
      jsonNode.attributes[key] = node[key];
    }
  }
  
  // 处理子节点
  if (node.outline) {
    jsonNode.children = processNode(node.outline);
  }
  
  return jsonNode;
}

/**
 * 将解析后的JSON树转换为扁平结构的知识点列表
 * 用于搜索和索引
 * @param {Object} tree - JSON树结构
 * @returns {Array} - 扁平化的知识点列表
 */
function flattenKnowledgeTree(tree, parentPath = '') {
  let results = [];
  
  const currentPath = parentPath ? `${parentPath}/${tree.name}` : tree.name;
  
  // 添加当前节点
  results.push({
    id: generateNodeId(tree.name),
    name: tree.name,
    path: currentPath,
    attributes: tree.attributes
  });
  
  // 递归处理子节点
  if (tree.children && tree.children.length > 0) {
    for (const child of tree.children) {
      const childResults = flattenKnowledgeTree(child, currentPath);
      results = results.concat(childResults);
    }
  }
  
  return results;
}

/**
 * 为节点生成唯一ID
 * @param {string} name - 节点名称
 * @returns {string} - 生成的ID
 */
function generateNodeId(name) {
  return 'node_' + Buffer.from(name).toString('base64').replace(/[+/=]/g, '');
}

module.exports = {
  parseOpmlToJsonTree,
  flattenKnowledgeTree
}; 