/**
 * 测试 CodeBuddy API - 使用流式请求
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// 读取凭证
const credsDir = path.resolve(process.cwd(), '.codebuddy_creds');
const files = fs.readdirSync(credsDir).filter(f => f.endsWith('.json') && f !== 'manager_state.json' && f.includes('homelearn'));

if (files.length === 0) {
  console.error('❌ 没有找到 homeLearn 凭证文件');
  process.exit(1);
}

const credFile = path.join(credsDir, files[0]);
const cred = JSON.parse(fs.readFileSync(credFile, 'utf-8'));
const apiKey = cred.bearer_token;
const userId = cred.user_id;

console.log('📋 凭证信息:');
console.log(`   文件: ${files[0]}`);
console.log(`   User ID: ${userId}`);
console.log('');

// 测试流式 API 调用
const postData = JSON.stringify({
  model: 'deepseek-v4-flash',
  messages: [
    { role: 'user', content: '你好，请回复"测试成功"' }
  ],
  stream: true
});

const options = {
  hostname: 'www.codebuddy.cn',
  port: 443,
  path: '/v2/chat/completions',
  method: 'POST',
  headers: {
    'Host': 'www.codebuddy.cn',
    'Accept': 'application/json, text/event-stream',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'X-Requested-With': 'XMLHttpRequest',
    'X-Domain': 'www.codebuddy.cn',
    'User-Agent': 'CLI/1.0.7 CodeBuddy/1.0.7',
    'X-Product': 'SaaS',
    'X-User-Id': userId,
    'Authorization': `Bearer ${apiKey}`,
  }
};

console.log('🔄 正在测试流式 API 调用...\n');

let fullResponse = '';

const req = https.request(options, (res) => {
  console.log(`📊 响应状态码: ${res.statusCode}`);
  console.log('');
  
  res.on('data', (chunk) => {
    const chunkStr = chunk.toString();
    fullResponse += chunkStr;
    
    // 输出原始数据用于调试
    process.stdout.write(chunkStr);
  });
});

req.on('error', (e) => {
  console.error(`❌ 请求错误: ${e.message}`);
});

req.write(postData);
req.end();
