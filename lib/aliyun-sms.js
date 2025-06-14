// 阿里云短信服务
const Core = require('@alicloud/pop-core');

// 创建客户端实例
function createClient() {
  return new Core({
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
    endpoint: 'https://dysmsapi.aliyuncs.com',
    apiVersion: '2017-05-25'
  });
}

// 发送验证码短信
export async function sendVerificationCode(phone, code) {
  const client = createClient();
  
  const params = {
    RegionId: "cn-hangzhou",
    PhoneNumbers: phone,
    SignName: process.env.ALIYUN_SMS_SIGN_NAME,
    TemplateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE,
    TemplateParam: JSON.stringify({ code })
  };

  const requestOption = {
    method: 'POST'
  };

  try {
    const result = await client.request('SendSms', params, requestOption);
    return result.Code === 'OK';
  } catch (error) {
    console.error('阿里云短信发送失败:', error);
    return false;
  }
}