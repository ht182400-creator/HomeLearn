/**
 * 测试 CodeBuddy 模型配置脚本
 * 运行方式: node scripts/test-codebuddy-model.js
 */

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

console.log('========== CodeBuddy 配置测试 ==========');
console.log('');

// 检查环境变量
console.log('环境变量配置:');
console.log(`  CODEBUDDY_MODEL: ${process.env.CODEBUDDY_MODEL || '(未设置，使用默认值 auto)'}`);
console.log(`  CODEBUDDY_MODELS: ${process.env.CODEBUDDY_MODELS || '(未设置)'}`);
console.log(`  CODEBUDDY_ENABLED: ${process.env.CODEBUDDY_ENABLED || '(未设置)'}`);
console.log('');

// 导入并创建 CodeBuddy 实例
const { CodeBuddyNative } = require('../src/lib/codebuddy/codebuddy-native');

console.log('创建 CodeBuddyNative 实例...');
const codebuddy = new CodeBuddyNative();

console.log(`实例默认模型: ${codebuddy.getDefaultModel()}`);
console.log('');

// 测试 chat 方法
async function testChat() {
  console.log('========== 测试 chat() 方法 ==========');
  try {
    const messages = [
      { role: 'user', content: '你好，请用一句话介绍自己' }
    ];
    
    console.log('调用 chat()...');
    const result = await codebuddy.chat(messages);
    console.log('响应:', result.substring(0, 100) + '...');
    console.log('✅ chat() 测试成功!');
  } catch (error) {
    console.log('❌ chat() 测试失败:', error.message);
  }
}

// 测试 chatStream 方法
async function testChatStream() {
  console.log('');
  console.log('========== 测试 chatStream() 方法 ==========');
  try {
    const messages = [
      { role: 'user', content: '数一下 1 到 5' }
    ];
    
    console.log('调用 chatStream()...');
    let fullResponse = '';
    for await (const chunk of codebuddy.chatStream(messages)) {
      fullResponse += chunk;
      process.stdout.write(chunk);
    }
    console.log('');
    console.log('✅ chatStream() 测试成功!');
  } catch (error) {
    console.log('❌ chatStream() 测试失败:', error.message);
  }
}

async function main() {
  await testChat();
  await testChatStream();
  console.log('');
  console.log('========== 测试完成 ==========');
}

main().catch(console.error);
