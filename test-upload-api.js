const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testUpload() {
    try {
        const form = new FormData();
        
        // 读取文件
        const fileBuffer = fs.readFileSync('2013-2022客观题分科真题：刑法.docx');
        form.append('file', fileBuffer, '刑法测试.docx');
        form.append('subject', '刑法');
        
        console.log('正在测试上传API...');
        
        const response = await fetch('http://localhost:3000/api/admin/upload-questions', {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });
        
        const result = await response.json();
        
        console.log('响应状态:', response.status);
        console.log('响应结果:', JSON.stringify(result, null, 2));
        
        if (!response.ok) {
            console.error('上传失败:', result.error);
        } else {
            console.log('上传成功!');
        }
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

// 检查服务器是否运行
fetch('http://localhost:3000/api/test-db')
    .then(() => {
        console.log('服务器正在运行，开始测试上传...');
        testUpload();
    })
    .catch(() => {
        console.error('错误: 服务器未运行，请先启动Next.js服务器');
        console.log('运行: npm run dev');
    });