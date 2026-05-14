/**
 * 测试 API 端点 - 验证 CodeBuddy 模型配置
 * 访问: http://localhost:3001/api/test-codebuddy
 */

import { NextResponse } from 'next/server';
import { CodeBuddyNative } from '@/lib/codebuddy/codebuddy-native';

export async function GET() {
  const codebuddy = new CodeBuddyNative();
  
  const config = {
    envModel: process.env.CODEBUDDY_MODEL || '(未设置)',
    instanceDefaultModel: codebuddy.getDefaultModel(),
    timestamp: new Date().toISOString(),
  };
  
  // 测试 chat 方法
  let chatResult = null;
  let chatError = null;
  
  try {
    const messages = [{ role: 'user', content: '说一个中文词语：' }];
    chatResult = await codebuddy.chat(messages);
    chatResult = chatResult.substring(0, 100) + '...';
  } catch (error: any) {
    chatError = error.message;
  }
  
  return NextResponse.json({
    success: true,
    config,
    chatTest: {
      result: chatResult,
      error: chatError,
    },
  });
}
