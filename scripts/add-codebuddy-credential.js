#!/usr/bin/env node
/**
 * CodeBuddy 凭证管理脚本
 * 
 * 用法:
 *   node scripts/add-codebuddy-credential.js add <bearer_token> [user_id]
 *   node scripts/add-codebuddy-credential.js list
 *   node scripts/add-codebuddy-credential.js delete <index>
 *   node scripts/add-codebuddy-credential.js refresh           # 刷新所有凭证
 *   node scripts/add-codebuddy-credential.js status          # 查看凭证状态
 *   node scripts/add-codebuddy-credential.js login           # 一键 OAuth 登录
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as https from 'https';
import * as http from 'http';
import * as crypto from 'crypto';

// ============ 常量 ============

const CREDS_DIR = path.resolve(process.cwd(), '.codebuddy_creds');
const CODEBUDDY_BASE_URL = 'www.codebuddy.cn';
const REFRESH_BUFFER_TIME = 600; // 10分钟

// ============ 凭证管理 ============

function createCredentialsDir() {
  if (!fs.existsSync(CREDS_DIR)) {
    fs.mkdirSync(CREDS_DIR, { recursive: true });
    console.log(`Created credentials directory: ${CREDS_DIR}`);
  }
}

function addCredential(bearerToken, userId) {
  createCredentialsDir();
  
  const timestamp = Math.floor(Date.now() / 1000);
  const safeUserId = (userId || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '').substring(0, 20);
  const filename = `codebuddy_${safeUserId}_${timestamp}.json`;
  
  const credential = {
    bearer_token: bearerToken,
    user_id: userId || null,
    created_at: timestamp,
    expires_in: 86400, // 默认 24 小时
  };
  
  const filePath = path.join(CREDS_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(credential, null, 2), 'utf-8');
  
  console.log(`Credential saved to: ${filePath}`);
  return filePath;
}

function listCredentials() {
  createCredentialsDir();
  
  const files = fs.readdirSync(CREDS_DIR).filter(f => f.endsWith('.json') && f !== 'manager_state.json');
  
  if (files.length === 0) {
    console.log('No credentials found.');
    console.log('\n💡 提示：运行以下命令一键登录 CodeBuddy:');
    console.log('   node scripts/add-codebuddy-credential.js login\n');
    return;
  }
  
  console.log('\n📋 CodeBuddy Credentials:\n');
  console.log('─'.repeat(60));

  files.forEach((file, index) => {
    const filePath = path.join(CREDS_DIR, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const createdAt = data.created_at ? new Date(data.created_at * 1000) : null;
      const expiresAt = data.created_at && data.expires_in 
        ? new Date((data.created_at + data.expires_in) * 1000) 
        : null;
      const now = Math.floor(Date.now() / 1000);
      const timeRemaining = expiresAt 
        ? Math.max(0, expiresAt.getTime() / 1000 - now) 
        : null;
      
      const isExpired = data.created_at && data.expires_in && 
        (now >= data.created_at + data.expires_in);
      const isExpiringSoon = timeRemaining !== null && timeRemaining <= REFRESH_BUFFER_TIME;
      const hasRefreshToken = !!data.refresh_token;
      
      // 状态图标
      let statusIcon = '✅';
      let statusText = 'Valid';
      if (isExpired) {
        statusIcon = '❌';
        statusText = 'EXPIRED';
      } else if (isExpiringSoon) {
        statusIcon = '⏰';
        statusText = 'Expiring Soon';
      }
      if (!hasRefreshToken) {
        statusText += ' (No refresh)';
      }
      
      console.log(`${index + 1}. ${statusIcon} ${file}`);
      console.log(`   User ID: ${data.user_id || 'N/A'}`);
      console.log(`   Created: ${createdAt ? createdAt.toLocaleString() : 'N/A'}`);
      console.log(`   Expires: ${expiresAt ? expiresAt.toLocaleString() : 'Never'}`);
      if (timeRemaining !== null && !isExpired) {
        const hours = Math.floor(timeRemaining / 3600);
        const minutes = Math.floor((timeRemaining % 3600) / 60);
        console.log(`   Remaining: ${hours}h ${minutes}m`);
      }
      console.log(`   Status: ${statusText}`);
      console.log(`   Refresh Token: ${hasRefreshToken ? 'Yes' : 'No'}`);
      console.log('─'.repeat(60));
    } catch (e) {
      console.log(`${index + 1}. ❌ ${file} - Error reading file`);
    }
  });
  
  console.log('');
}

function deleteCredential(index) {
  createCredentialsDir();
  
  const files = fs.readdirSync(CREDS_DIR).filter(f => f.endsWith('.json') && f !== 'manager_state.json');
  
  if (index < 1 || index > files.length) {
    console.error(`Invalid index. Please choose between 1 and ${files.length}`);
    process.exit(1);
  }
  
  const file = files[index - 1];
  const filePath = path.join(CREDS_DIR, file);
  
  fs.unlinkSync(filePath);
  console.log(`Deleted: ${file}`);
}

// ============ OAuth 登录 ============

function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

async function startOAuthAuth() {
  console.log('\n🔐 启动 CodeBuddy OAuth 认证...\n');
  
  const nonce = generateNonce();
  
  const postData = JSON.stringify({ nonce });
  
  const options = {
    hostname: CODEBUDDY_BASE_URL,
    port: 443,
    path: `/v2/plugin/auth/state?platform=CLI&nonce=${nonce}`,
    method: 'POST',
    headers: {
      'Host': CODEBUDDY_BASE_URL,
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Cache-Control': 'no-cache',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Domain': 'www.codebuddy.cn',
      'X-No-Authorization': 'true',
      'X-No-User-Id': 'true',
      'X-No-Enterprise-Id': 'true',
      'X-No-Department-Info': 'true',
      'User-Agent': 'CLI/1.0.8 CodeBuddy/1.0.8',
      'X-Product': 'SaaS',
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.code === 0 && result.data) {
            resolve({
              authState: result.data.state,
              authUrl: result.data.authUrl,
            });
          } else {
            reject(new Error(result.msg || '认证启动失败'));
          }
        } catch (e) {
          reject(new Error('解析响应失败'));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function pollOAuthAuth(authState) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: CODEBUDDY_BASE_URL,
      port: 443,
      path: `/v2/plugin/auth/token?state=${authState}`,
      method: 'GET',
      headers: {
        'Host': CODEBUDDY_BASE_URL,
        'Accept': 'application/json, text/plain, */*',
        'Cache-Control': 'no-cache',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Request-ID': generateNonce(),
        'X-Domain': 'www.codebuddy.cn',
        'User-Agent': 'CLI/1.0.8 CodeBuddy/1.0.8',
        'X-Product': 'SaaS',
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.code === 11217) {
            resolve({ status: 'pending' });
          } else if (result.code === 0 && result.data?.accessToken) {
            resolve({
              status: 'success',
              tokenData: result.data,
            });
          } else {
            resolve({ status: 'unknown', message: result.msg });
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

function parseJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return { user_id: 'unknown' };
    
    let payloadPart = parts[1];
    const missingPadding = payloadPart.length % 4;
    if (missingPadding) {
      payloadPart += '='.repeat(4 - missingPadding);
    }
    
    const payload = Buffer.from(payloadPart, 'base64').toString('utf-8');
    const jwtData = JSON.parse(payload);
    
    return {
      user_id: jwtData.email || jwtData.preferred_username || jwtData.sub || 'unknown',
      user_info: jwtData,
    };
  } catch (e) {
    return { user_id: 'unknown' };
  }
}

function saveOAuthToken(tokenData) {
  createCredentialsDir();
  
  const { user_id, user_info } = parseJwtPayload(tokenData.accessToken);
  
  const credential = {
    bearer_token: tokenData.accessToken,
    user_id,
    created_at: Math.floor(Date.now() / 1000),
    expires_in: tokenData.expiresIn || 86400,
    refresh_token: tokenData.refreshToken,
    token_type: tokenData.tokenType || 'Bearer',
    scope: tokenData.scope,
    domain: tokenData.domain,
    session_state: tokenData.sessionState,
    user_info,
  };
  
  // 移除空值
  const cleanCredential = Object.fromEntries(
    Object.entries(credential).filter(([_, v]) => v !== undefined)
  );
  
  const safeUserId = user_id.replace(/[^a-zA-Z0-9._-]/g, '').substring(0, 20);
  const filename = `codebuddy_${safeUserId}_${Math.floor(Date.now() / 1000)}.json`;
  const filePath = path.join(CREDS_DIR, filename);
  
  fs.writeFileSync(filePath, JSON.stringify(cleanCredential, null, 2), 'utf-8');
  
  return { filename, user_id };
}

async function doOAuthLogin() {
  try {
    console.log('\n🚀 CodeBuddy 一键登录\n');
    console.log('这个命令会：');
    console.log('1. 生成登录链接');
    console.log('2. 自动打开浏览器');
    console.log('3. 登录成功后自动保存 token\n');
    
    const { authState, authUrl } = await startOAuthAuth();
    
    console.log('✅ 认证链接已生成！\n');
    console.log('📋 请在浏览器中打开以下链接完成登录：\n');
    console.log(`🔗 ${authUrl}\n`);
    
    // 尝试自动打开浏览器
    const openCommand = process.platform === 'win32' ? 'start' : 
                       process.platform === 'darwin' ? 'open' : 'xdg-open';
    try {
      require('child_process').exec(`${openCommand} "${authUrl}"`);
      console.log('🌐 已自动打开浏览器\n');
    } catch (e) {
      console.log('💡 请手动复制上方链接到浏览器打开\n');
    }
    
    console.log('⏳ 等待登录确认...\n');
    console.log('   (登录成功后会自动保存 token)\n');
    
    // 轮询等待登录
    let attempts = 0;
    const maxAttempts = 100; // 最多等待 5 分钟 (100 * 3秒)
    
    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 3000)); // 每 3 秒轮询一次
      attempts++;
      
      process.stdout.write(`\r   检查中... (${attempts}/${maxAttempts}) `);
      
      try {
        const result = await pollOAuthAuth(authState);
        
        if (result.status === 'success') {
          console.log('\n\n');
          const { filename, user_id } = saveOAuthToken(result.tokenData);
          
          console.log('🎉 登录成功！\n');
          console.log('─'.repeat(50));
          console.log(`   用户: ${user_id}`);
          console.log(`   文件: ${filename}`);
          console.log(`   有效期: ${result.tokenData.expiresIn ? Math.round(result.tokenData.expiresIn / 3600) : 24} 小时`);
          console.log('─'.repeat(50));
          console.log('\n💡 Token 已自动保存，之后会自动续期，无需任何操作！\n');
          return;
        } else if (result.status === 'unknown') {
          console.log('\n\n❌ 认证失败:', result.message);
          return;
        }
        // 如果是 pending，继续等待
      } catch (e) {
        // 继续等待
      }
    }
    
    console.log('\n\n⏰ 登录超时，请重新运行命令');
    
  } catch (e) {
    console.error('\n❌ 登录失败:', e.message);
    console.log('\n💡 可以尝试手动添加 token:');
    console.log('   node scripts/add-codebuddy-credential.js add <your_token>\n');
  }
}

// ============ 刷新凭证 ============

async function refreshCredentials() {
  console.log('\n🔄 检查凭证状态...\n');
  
  const files = fs.readdirSync(CREDS_DIR).filter(f => f.endsWith('.json') && f !== 'manager_state.json');
  
  if (files.length === 0) {
    console.log('❌ 没有找到凭证文件');
    console.log('\n💡 请先登录: node scripts/add-codebuddy-credential.js login\n');
    return;
  }
  
  let refreshed = 0;
  let failed = 0;
  let skipped = 0;
  
  for (const file of files) {
    const filePath = path.join(CREDS_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    if (!data.refresh_token) {
      console.log(`⏭️  ${file} - 没有 refresh_token，跳过`);
      skipped++;
      continue;
    }
    
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = data.created_at + data.expires_in;
    const timeRemaining = expiresAt - now;
    
    if (timeRemaining > REFRESH_BUFFER_TIME) {
      console.log(`✅ ${file} - 状态正常，无需刷新`);
      continue;
    }
    
    console.log(`⏰ ${file} - 即将过期，尝试刷新...`);
    
    // 注意：标准刷新方式可能不可用，这里只是检查
    if (data.refresh_token) {
      console.log(`   ⚠️  该凭证支持自动刷新，但需要服务器端配合`);
      console.log(`   💡  请运行 npm run dev 启动服务器后访问 /api/codebuddy/refresh`);
    } else {
      console.log(`   ❌ 无法自动刷新，请手动更新`);
    }
    
    skipped++;
  }
  
  console.log('\n📊 刷新统计:');
  console.log(`   刷新成功: ${refreshed}`);
  console.log(`   刷新失败: ${failed}`);
  console.log(`   跳过: ${skipped}\n`);
  
  if (refreshed === 0 && skipped > 0) {
    console.log('💡 提示: 如果有凭证即将过期但无法刷新，请运行:');
    console.log('   node scripts/add-codebuddy-credential.js login\n');
  }
}

// ============ 主函数 ============

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  // 一键 OAuth 登录
  if (command === 'login') {
    await doOAuthLogin();
    return;
  }
  
  // 刷新凭证
  if (command === 'refresh') {
    await refreshCredentials();
    return;
  }
  
  // 查看状态
  if (command === 'status') {
    listCredentials();
    return;
  }
  
  // 列出所有凭证
  if (command === 'list') {
    listCredentials();
    return;
  }
  
  // 删除凭证
  if (command === 'delete') {
    const index = parseInt(args[1], 10);
    if (isNaN(index)) {
      console.error('Usage: node scripts/add-codebuddy-credential.js delete <index>');
      process.exit(1);
    }
    deleteCredential(index);
    return;
  }
  
  // 添加凭证
  if (command === 'add' && args.length >= 2) {
    const bearerToken = args[1];
    const userId = args[2] || null;
    addCredential(bearerToken, userId);
    return;
  }
  
  // 交互式添加
  if (!args.length || command === 'add') {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
    
    console.log('\n=== 添加 CodeBuddy 凭证 ===\n');
    
    let bearerToken = args[1];
    if (!bearerToken) {
      bearerToken = await question('输入 bearer_token: ');
    }
    
    if (!bearerToken) {
      console.error('Error: bearer_token 是必填项');
      rl.close();
      process.exit(1);
    }
    
    const userId = args[2] || await question('输入 user_id (可选，直接回车跳过): ');
    
    rl.close();
    addCredential(bearerToken, userId || null);
    return;
  }
  
  // 帮助信息
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         CodeBuddy 凭证管理工具 v2.0                          ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  🚀 新增功能:                                               ║
║     login    - 一键 OAuth 登录（推荐！）                     ║
║     refresh  - 刷新即将过期的凭证                           ║
║     status   - 查看凭证状态                                 ║
║                                                            ║
║  📝 基础功能:                                               ║
║     add <token> [user_id]  - 添加凭证                       ║
║     list                    - 列出所有凭证                 ║
║     delete <index>          - 删除凭证                     ║
║                                                            ║
║  💡 使用示例:                                               ║
║     node scripts/add-codebuddy-credential.js login         ║
║     node scripts/add-codebuddy-credential.js add "token"   ║
║     node scripts/add-codebuddy-credential.js list          ║
║     node scripts/add-codebuddy-credential.js refresh       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);
}

main().catch(console.error);
