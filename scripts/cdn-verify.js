#!/usr/bin/env node

/**
 * CDN配置验证脚本
 * 用于验证CDN配置是否正确工作
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// 测试URL列表
const testUrls = [
  'https://xuexidazi.com/_next/static/chunks/framework.js',
  'https://xuexidazi.com/_next/static/css/app.css',
  'https://xuexidazi.com/uploads/placeholder.jpg',
  'https://xuexidazi.com/api/exams/questions', // 这个不应该被缓存
  'https://xuexidazi.com/api/auth/profile', // 这个也不应该被缓存
];

/**
 * 发送HTTP请求
 */
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'HEAD',
      headers: {
        'User-Agent': 'CDN-Verify-Script/1.0'
      }
    };
    
    const req = client.request(options, (res) => {
      resolve({
        url,
        statusCode: res.statusCode,
        headers: res.headers,
        cacheStatus: res.headers['x-cache'] || res.headers['x-cache-status'] || 'UNKNOWN',
        cacheControl: res.headers['cache-control'] || 'NOT_SET',
        server: res.headers['server'] || 'UNKNOWN'
      });
    });
    
    req.on('error', (err) => {
      reject({ url, error: err.message });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject({ url, error: 'Request timeout' });
    });
    
    req.end();
  });
}

/**
 * 验证CDN配置
 */
async function verifyCDN() {
  console.log('🔍 开始验证CDN配置...\n');
  
  const results = [];
  
  for (const url of testUrls) {
    try {
      console.log(`检查: ${url}`);
      const result = await makeRequest(url);
      results.push(result);
      
      // 分析结果
      console.log(`  状态码: ${result.statusCode}`);
      console.log(`  缓存状态: ${result.cacheStatus}`);
      console.log(`  缓存控制: ${result.cacheControl}`);
      console.log(`  服务器: ${result.server}`);
      
      // 验证缓存策略
      if (url.includes('/_next/static/')) {
        if (result.cacheStatus === 'HIT' || result.cacheStatus === 'MISS') {
          console.log('  ✅ 静态资源缓存配置正确');
        } else {
          console.log('  ⚠️  静态资源缓存状态异常');
        }
      } else if (url.includes('/api/')) {
        if (result.cacheControl.includes('no-cache') || result.cacheStatus === 'MISS') {
          console.log('  ✅ API路由不缓存配置正确');
        } else {
          console.log('  ❌ API路由被缓存，配置错误！');
        }
      } else if (url.includes('/uploads/')) {
        if (result.cacheStatus === 'HIT' || result.cacheStatus === 'MISS') {
          console.log('  ✅ 上传文件缓存配置正确');
        } else {
          console.log('  ⚠️  上传文件缓存状态异常');
        }
      }
      
    } catch (error) {
      console.log(`  ❌ 请求失败: ${error.error}`);
      results.push({ url, error: error.error });
    }
    
    console.log('');
  }
  
  // 生成报告
  console.log('📊 验证报告:');
  console.log('═'.repeat(60));
  
  let successCount = 0;
  let errorCount = 0;
  let warningCount = 0;
  
  results.forEach(result => {
    if (result.error) {
      errorCount++;
      console.log(`❌ ${result.url} - 错误: ${result.error}`);
    } else if (result.statusCode >= 200 && result.statusCode < 300) {
      successCount++;
      console.log(`✅ ${result.url} - OK (${result.statusCode})`);
    } else {
      warningCount++;
      console.log(`⚠️  ${result.url} - 状态码: ${result.statusCode}`);
    }
  });
  
  console.log('');
  console.log(`总计: ${results.length} 个URL`);
  console.log(`成功: ${successCount}`);
  console.log(`警告: ${warningCount}`);
  console.log(`错误: ${errorCount}`);
  
  // 提供建议
  console.log('\n💡 建议:');
  if (errorCount > 0) {
    console.log('- 检查域名解析和服务器状态');
    console.log('- 确保CNAME记录已正确配置');
  }
  if (warningCount > 0) {
    console.log('- 检查CDN缓存规则配置');
    console.log('- 验证API路由是否正确排除缓存');
  }
  if (successCount === results.length) {
    console.log('- CDN配置看起来正常！');
  }
  
  console.log('\n🔗 相关链接:');
  console.log('- 阿里云CDN控制台: https://cdn.console.aliyun.com');
  console.log('- 缓存配置文档: ./cdn-cache-config.md');
}

// 执行验证
if (require.main === module) {
  verifyCDN().catch(console.error);
}

module.exports = { verifyCDN, makeRequest };