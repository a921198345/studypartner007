/** @type {import('next').NextConfig} */

// 改为仅在生产环境进行预热，开发环境不执行缓存预热
if (process.env.NODE_ENV === 'production') {
  // 导入预热模块
  // 注意：这里使用了动态导入，因为在配置文件中不能直接使用require
  import('./scripts/warm-cache.js')
    .then(module => {
      console.log('缓存预热模块已加载');
      
      // 在生产环境中启动5秒后预热缓存
      console.log('服务器启动，5秒后将开始预热缓存...');
      setTimeout(() => {
        try {
          module.default(); // 执行预热函数
        } catch(error) {
          console.error('自动预热缓存失败:', error);
        }
      }, 5000);
    })
    .catch(err => {
      console.error('加载缓存预热模块失败，应用继续启动:', err);
    });
} else {
  console.log('开发环境：跳过缓存预热过程');
}

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
  
  // 防止应用构建时出现@radix-ui和@opentelemetry模块缺失问题
  experimental: {
    // 排除特定依赖不进行捆绑
    esmExternals: 'loose',
    // 优化模块分块策略
    optimizePackageImports: ['@radix-ui', '@opentelemetry']
  },
  
  // 服务器启动后钩子(Next.js 13+)
  onStart: async () => {
    if (process.env.NODE_ENV === 'production') {
      try {
        console.log('Next.js服务器已启动，准备预热缓存');
        // 启动完成后再次预热缓存(双重保险)
        setTimeout(async () => {
          try {
            const warmupModule = await import('./scripts/warm-cache.js');
            await warmupModule.default();
          } catch(error) {
            console.error('onStart预热缓存失败，不影响应用运行:', error);
          }
        }, 10000);
      } catch(error) {
        console.error('onStart钩子执行失败，不影响应用运行:', error);
      }
    }
  }
}

export default nextConfig
