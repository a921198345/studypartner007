const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 8080

// 创建 Next.js 应用实例
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

console.log('🚀 启动法律考试助手服务器...')
console.log(`环境: ${dev ? '开发' : '生产'}`)
console.log(`端口: ${port}`)

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      // 解析请求URL
      const parsedUrl = parse(req.url, true)
      
      // 处理请求
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('处理请求时发生错误:', req.url, err)
      res.statusCode = 500
      res.end('服务器内部错误')
    }
  })
  .once('error', (err) => {
    console.error('服务器启动错误:', err)
    process.exit(1)
  })
  .listen(port, () => {
    console.log(`✅ 服务器已启动: http://${hostname}:${port}`)
    console.log('🌐 准备就绪，等待请求...')
  })
}).catch((err) => {
  console.error('Next.js 应用准备失败:', err)
  process.exit(1)
})