/**
 * CodeBuddy Token 刷新 API
 * 
 * GET /api/codebuddy/refresh
 *   - 检查所有凭证状态
 *   - 自动刷新需要刷新的 token
 * 
 * POST /api/codebuddy/refresh
 *   - 强制刷新所有凭证
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCodeBuddyNative } from '@/lib/codebuddy/codebuddy-native';
import { refreshAllCredentials, checkCredentialsStatus } from '@/lib/codebuddy/codebuddy-refresh';

export async function GET(request: NextRequest) {
  try {
    const codebuddy = getCodeBuddyNative();
    const tokenManager = codebuddy.getTokenManager();
    const credentialsInfo = tokenManager.getCredentialsInfo();

    // 检查状态
    const credentials = credentialsInfo.map(info => ({
      bearer_token: '***',
      user_id: info.user_id,
      created_at: info.created_at,
      expires_in: info.expires_in,
      refresh_token: info.has_refresh_token ? '***' : undefined,
    }));

    const status = checkCredentialsStatus(credentials);

    // 自动刷新快过期的凭证
    const refreshResult = await refreshAllCredentials();

    return NextResponse.json({
      success: true,
      status: 'ok',
      credentials_count: credentialsInfo.length,
      credentials_status: status,
      auto_refresh: refreshResult,
      message: status.expiringSoon > 0 
        ? `有 ${status.expiringSoon} 个凭证即将过期，正在自动刷新`
        : '所有凭证状态正常',
    });
  } catch (e: any) {
    console.error('[CodeBuddy Refresh API] 检查失败:', e);
    return NextResponse.json({
      success: false,
      error: e.message,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[CodeBuddy Refresh API] 强制刷新所有凭证...');
    
    const result = await refreshAllCredentials();

    if (result.refreshed > 0) {
      return NextResponse.json({
        success: true,
        message: `成功刷新 ${result.refreshed} 个凭证`,
        ...result,
      });
    } else if (result.failed > 0) {
      return NextResponse.json({
        success: false,
        message: `刷新失败 ${result.failed} 个凭证`,
        ...result,
      }, { status: 500 });
    } else {
      return NextResponse.json({
        success: true,
        message: '没有需要刷新的凭证',
        ...result,
      });
    }
  } catch (e: any) {
    console.error('[CodeBuddy Refresh API] 刷新失败:', e);
    return NextResponse.json({
      success: false,
      error: e.message,
    }, { status: 500 });
  }
}
