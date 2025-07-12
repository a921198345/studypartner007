# CDN优化配置指南

## 概述
本指南介绍如何为法律考试助手配置CDN，实现最佳访问性能。

## CDN配置步骤

### 1. 阿里云CDN设置
1. 登录阿里云控制台 → CDN → 域名管理
2. 添加加速域名：`cdn.xuexidazi.com`
3. 源站设置：`xuexidazi.com` 或服务器IP
4. 加速区域：中国大陆

### 2. DNS配置
```
cdn.xuexidazi.com CNAME [阿里云CDN提供的CNAME地址]
```

### 3. 缓存规则配置
| 文件类型 | 缓存时间 | 规则 |
|---------|---------|------|
| `/_next/static/*` | 1年 | 不可变资源 |
| `*.js, *.css` | 30天 | 静态资源 |
| `*.png, *.jpg, *.svg` | 30天 | 图片资源 |
| `/uploads/*` | 30天 | 用户上传文件 |
| HTML页面 | 10分钟 | 动态内容 |

### 4. 回源配置
- 回源HOST：`xuexidazi.com`
- 协议跟随：开启HTTPS
- 回源端口：443

### 5. HTTPS配置
1. 申请SSL证书 (Let's Encrypt 或购买)
2. 配置HTTPS回源
3. 强制HTTPS跳转

## Next.js CDN集成

### 环境变量
```bash
# .env.production
CDN_URL=https://cdn.xuexidazi.com
NODE_ENV=production
```

### Next.js配置
已在 `next.config.mjs` 中配置：
- `assetPrefix`: 自动为静态资源添加CDN前缀
- 缓存控制头: 为不同类型资源设置适当缓存策略
- 安全头部: 增强网站安全性

## 部署命令

### 标准部署
```bash
bash deploy.sh
```

### CDN优化部署
```bash
bash deploy-with-cdn.sh
```

## 性能优化建议

### 1. 预热常用资源
部署后可以预热CDN缓存：
```bash
curl https://cdn.xuexidazi.com/_next/static/css/[main-css-file]
curl https://cdn.xuexidazi.com/_next/static/js/[main-js-file]
```

### 2. 监控CDN性能
- 缓存命中率应 > 90%
- 回源带宽应 < 10%
- 访问延迟应 < 100ms

### 3. 清理CDN缓存
更新静态资源后：
```bash
# 通过阿里云控制台或API清理缓存
# 目录刷新: /_next/static/
# URL刷新: 具体文件URL
```

## 故障排查

### 1. CDN配置检查
```bash
# 检查CNAME解析
nslookup cdn.xuexidazi.com

# 检查CDN响应头
curl -I https://cdn.xuexidazi.com/_next/static/css/app.css
```

### 2. 回源检查
```bash
# 直接访问源站
curl -I https://xuexidazi.com/_next/static/css/app.css

# 检查回源HOST
curl -I -H "Host: xuexidazi.com" http://[源站IP]/_next/static/css/app.css
```

### 3. 常见问题
- **404错误**: 检查源站文件是否存在
- **502错误**: 检查源站服务状态
- **缓存不生效**: 检查缓存规则配置
- **HTTPS错误**: 检查SSL证书配置

## 最佳实践

1. **静态资源版本化**: Next.js自动处理
2. **合理设置缓存时间**: 静态资源长缓存，动态内容短缓存
3. **监控CDN性能**: 定期检查缓存命中率和访问质量
4. **安全配置**: 启用HTTPS，配置安全头部
5. **成本优化**: 合理配置缓存规则，减少回源流量

## 测试验证

部署完成后，测试以下项目：
- ✅ 网站首页正常加载
- ✅ 静态资源通过CDN加载
- ✅ 图片和CSS样式正常显示
- ✅ JavaScript功能正常工作
- ✅ 移动端访问正常
- ✅ 不同网络环境下访问速度

完成这些配置后，你的网站将获得最佳的访问性能和用户体验！