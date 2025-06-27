# 生产环境配置指南

## 需要创建的文件：`.env.production`

在项目根目录创建这个文件，内容如下：

```bash
# 生产环境配置文件
# 请把下面的域名改成你的实际域名

# 网站基础配置
NEXT_PUBLIC_SITE_URL=https://你的域名.com
NEXTAUTH_URL=https://你的域名.com
NEXTAUTH_SECRET=你的安全密钥_请改成复杂的字符串

# 数据库配置（根据实际情况修改）
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=你的数据库密码
DB_NAME=law_exam

# DeepSeek API密钥
DEEPSEEK_API_KEY=你的deepseek_api_key

# 阿里云短信配置
ALIYUN_ACCESS_KEY_ID=你的阿里云AccessKey
ALIYUN_ACCESS_KEY_SECRET=你的阿里云Secret
ALIYUN_SMS_SIGN_NAME=你的短信签名
ALIYUN_SMS_TEMPLATE_CODE=你的短信模板

# OCR API密钥
OCR_SPACE_API_KEY=K87316415888957

# 生产环境设置
MOCK_AI_RESPONSE=false
NODE_ENV=production
```

## 重要提醒：
1. 把 `你的域名.com` 改成你的实际域名
2. 把各种密钥填入真实的值
3. 这个文件包含敏感信息，不要提交到Git 