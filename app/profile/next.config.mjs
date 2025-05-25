/** @type {import('next').NextConfig} */

// 导入预热模块
// 注意：这里使用了动态导入，因为在配置文件中不能直接使用require
import('./scripts/warm-cache.js')
  .then(module => {
    console.log('缓存预热模块已加载');
    
    // 这里我们不立即执行预热，因为此时可能数据库连接还未完全建立
    // 在生产环境中启动5秒后预热缓存
    if (process.env.NODE_ENV === 'production') {
      console.log('服务器启动，5秒后将开始预热缓存...');
      setTimeout(() => {
        try {
          module.default(); // 执行预热函数
        } catch(error) {
          console.error('自动预热缓存失败:', error);
        }
      }, 5000);
    }
  })
  .catch(err => {
    console.error('加载缓存预热模块失败:', err);
  });

const nextConfig = {
  //basePath: '/law-exam',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  swcMinify: true,
  
  // 服务器启动后钩子(Next.js 13+)
  onStart: async () => {
    try {
      console.log('Next.js服务器已启动，准备预热缓存');
      // 启动完成后再次预热缓存(双重保险)
      setTimeout(async () => {
        try {
          const warmupModule = await import('./scripts/warm-cache.js');
          await warmupModule.default();
        } catch(error) {
          console.error('onStart预热缓存失败:', error);
        }
      }, 10000);
    } catch(error) {
      console.error('onStart钩子执行失败:', error);
    }
  }
}

export default nextConfig
