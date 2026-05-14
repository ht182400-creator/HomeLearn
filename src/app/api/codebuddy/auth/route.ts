/**
 * CodeBuddy OAuth 认证路由
 * 实现一键登录 + 自动刷新 token 功能
 * 
 * 用户只需访问 /api/codebuddy/auth/start 一次，在浏览器完成登录后
 * token 会自动保存到 .codebuddy_creds 目录，后续无需任何操作
 */

import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { getCodeBuddyNative, getCredentialsDir } from '@/lib/codebuddy/codebuddy-native';
import * as fs from 'fs';
import * as path from 'path';

// ============ 常量 ============

const CODEBUDDY_BASE_URL = 'https://www.codebuddy.cn';
const CODEBUDDY_AUTH_STATE_ENDPOINT = `${CODEBUDDY_BASE_URL}/v2/plugin/auth/state`;
const CODEBUDDY_AUTH_TOKEN_ENDPOINT = `${CODEBUDDY_BASE_URL}/v2/plugin/auth/token`;

// 内存中存储 auth_state（生产环境建议用 Redis）
let _lastAuthState: string | null = null;
let _pendingAuthState: Map<string, { authUrl: string; createdAt: number }> = new Map();

// 清理过期的 auth_state（30分钟过期）
function cleanupExpiredStates() {
  const now = Date.now();
  for (const [key, value] of _pendingAuthState.entries()) {
    if (now - value.createdAt > 30 * 60 * 1000) {
      _pendingAuthState.delete(key);
    }
  }
}

// ============ 辅助函数 ============

function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

function getHeaders(isAuthStart: boolean = false): Record<string, string> {
  const requestId = crypto.randomUUID().replace(/-/g, '');
  const baseHeaders: Record<string, string> = {
    'Host': 'www.codebuddy.cn',
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Connection': 'close',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Domain': 'www.codebuddy.cn',
    'User-Agent': 'CLI/1.0.8 CodeBuddy/1.0.8',
    'X-Product': 'SaaS',
    'X-Request-ID': requestId,
  };

  if (isAuthStart) {
    baseHeaders['X-No-Authorization'] = 'true';
    baseHeaders['X-No-User-Id'] = 'true';
    baseHeaders['X-No-Enterprise-Id'] = 'true';
    baseHeaders['X-No-Department-Info'] = 'true';
  }

  return baseHeaders;
}

/**
 * 解析 JWT token 获取用户信息
 */
function parseJwtPayload(token: string): { user_id: string; user_info: Record<string, any> } {
  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return { user_id: 'unknown', user_info: {} };
    }

    // 修复 Base64 padding
    let payloadPart = parts[1];
    const missingPadding = payloadPart.length % 4;
    if (missingPadding) {
      payloadPart += '='.repeat(4 - missingPadding);
    }

    const payload = Buffer.from(payloadPart, 'base64').toString('utf-8');
    const jwtData = JSON.parse(payload);

    const user_id = jwtData.email || jwtData.preferred_username || jwtData.sub || 'unknown';
    const user_info = {
      email: jwtData.email,
      preferred_username: jwtData.preferred_username,
      name: jwtData.name,
      sub: jwtData.sub,
      exp: jwtData.exp,
      iat: jwtData.iat,
    };

    return { user_id, user_info };
  } catch (e) {
    console.error('[CodeBuddy OAuth] JWT 解析失败:', e);
    return { user_id: 'unknown', user_info: {} };
  }
}

/**
 * 保存 token 到文件
 */
function saveTokenToFile(tokenData: {
  bearer_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  domain?: string;
  session_state?: string;
}): { success: boolean; filename?: string; error?: string } {
  try {
    const credsDir = getCredentialsDir();
    if (!fs.existsSync(credsDir)) {
      fs.mkdirSync(credsDir, { recursive: true });
    }

    // 解析 JWT 获取用户信息
    const { user_id, user_info } = parseJwtPayload(tokenData.bearer_token);

    const credential = {
      bearer_token: tokenData.bearer_token,
      user_id,
      created_at: Math.floor(Date.now() / 1000),
      expires_in: tokenData.expires_in || 86400,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type || 'Bearer',
      scope: tokenData.scope,
      domain: tokenData.domain,
      session_state: tokenData.session_state,
      user_info,
    };

    // 移除空值
    const cleanCredential = Object.fromEntries(
      Object.entries(credential).filter(([_, v]) => v !== undefined)
    );

    // 生成文件名
    const safeUserId = user_id.replace(/[^a-zA-Z0-9._-]/g, '').substring(0, 20);
    const timestamp = Math.floor(Date.now() / 1000);
    const filename = `codebuddy_${safeUserId || 'user'}_${timestamp}.json`;
    const filePath = path.join(credsDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(cleanCredential, null, 2), 'utf-8');

    console.log(`[CodeBuddy OAuth] Token 已保存: ${filename}`);
    return { success: true, filename };
  } catch (e: any) {
    console.error('[CodeBuddy OAuth] 保存 token 失败:', e);
    return { success: false, error: e.message };
  }
}

// ============ API 路由 ============

/**
 * GET /api/codebuddy/auth/start
 * 启动 OAuth 认证流程，返回登录 URL
 */
export async function GET(request: NextRequest) {
  cleanupExpiredStates();

  try {
    console.log('[CodeBuddy OAuth] 启动认证流程...');

    const nonce = generateNonce();
    const headers = getHeaders(true);

    const response = await fetch(`${CODEBUDDY_AUTH_STATE_ENDPOINT}?platform=CLI&nonce=${nonce}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ nonce }),
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'auth_start_failed',
        message: `认证启动失败: ${response.status}`,
      }, { status: 500 });
    }

    const result = await response.json();

    if (result.code === 0 && result.data) {
      const data = result.data;
      let authState = data.state;
      let authUrl = data.authUrl;

      // 如果返回的 state 与上次相同，尝试重新获取
      if (_lastAuthState && authState === _lastAuthState) {
        console.log('[CodeBuddy OAuth] 上游返回的 state 相同，重新获取...');
        const nonce2 = generateNonce();
        const response2 = await fetch(`${CODEBUDDY_AUTH_STATE_ENDPOINT}?platform=CLI&nonce=${nonce2}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ nonce: nonce2 }),
        });

        if (response2.ok) {
          const result2 = await response2.json();
          if (result2.code === 0 && result2.data && result2.data.state !== authState) {
            authState = result2.data.state;
            authUrl = result2.data.authUrl;
          }
        }
      }

      // 保存 auth_state 用于后续轮询
      _pendingAuthState.set(authState, {
        authUrl,
        createdAt: Date.now(),
      });
      _lastAuthState = authState;

      return NextResponse.json({
        success: true,
        method: 'codebuddy_oauth',
        auth_state: authState,
        auth_url: authUrl,
        verification_uri: CODEBUDDY_BASE_URL,
        expires_in: 1800, // 30分钟有效期
        interval: 3, // 轮询间隔（秒）
        message: '请在浏览器中打开链接完成登录',
        instructions: '点击下方链接完成 CodeBuddy 登录，登录成功后页面会自动显示成功提示',
      });
    }

    return NextResponse.json({
      success: false,
      error: 'auth_start_failed',
      message: result.msg || '无法启动认证流程',
    }, { status: 500 });

  } catch (e: any) {
    console.error('[CodeBuddy OAuth] 认证启动异常:', e);
    return NextResponse.json({
      success: false,
      error: 'auth_start_failed',
      message: e.message,
    }, { status: 500 });
  }
}

/**
 * POST /api/codebuddy/auth/poll
 * 轮询认证状态，登录成功后返回 token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { auth_state } = body;

    if (!auth_state) {
      return NextResponse.json({
        success: false,
        error: 'missing_auth_state',
        message: '缺少 auth_state 参数',
      }, { status: 400 });
    }

    // 检查是否在等待列表中
    const pendingAuth = _pendingAuthState.get(auth_state);
    if (!pendingAuth) {
      // 如果不在等待列表中，尝试直接轮询（可能是刷新 token）
      console.log('[CodeBuddy OAuth] auth_state 不在等待列表中，直接轮询...');
    }

    console.log(`[CodeBuddy OAuth] 轮询认证状态: ${auth_state}`);

    const headers = getHeaders(false);
    const response = await fetch(`${CODEBUDDY_AUTH_TOKEN_ENDPOINT}?state=${auth_state}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'poll_failed',
        message: `轮询请求失败: ${response.status}`,
      }, { status: 500 });
    }

    const result = await response.json();

    // code 11217 = 等待登录中
    if (result.code === 11217) {
      return NextResponse.json({
        success: true,
        status: 'pending',
        message: '等待登录中... 请在浏览器中完成登录',
        code: result.code,
      });
    }

    // code 0 = 登录成功
    if (result.code === 0 && result.data?.accessToken) {
      const data = result.data;

      // 保存 token
      const saveResult = saveTokenToFile({
        bearer_token: data.accessToken,
        refresh_token: data.refreshToken,
        expires_in: data.expiresIn,
        token_type: data.tokenType,
        scope: data.scope,
        domain: data.domain,
        session_state: data.sessionState,
      });

      // 从 token 中解析用户信息
      const { user_id } = parseJwtPayload(data.accessToken);

      // 从等待列表中移除
      _pendingAuthState.delete(auth_state);

      console.log(`[CodeBuddy OAuth] 登录成功! 用户: ${user_id}`);

      return NextResponse.json({
        success: true,
        status: 'success',
        message: '登录成功！Token 已自动保存',
        saved: saveResult.success,
        filename: saveResult.filename,
        user_id,
        expires_in: data.expiresIn,
      });
    }

    // 其他状态
    return NextResponse.json({
      success: false,
      status: 'unknown',
      message: result.msg || '未知状态',
      code: result.code,
    }, { status: 400 });

  } catch (e: any) {
    console.error('[CodeBuddy OAuth] 轮询异常:', e);
    return NextResponse.json({
      success: false,
      error: 'poll_failed',
      message: e.message,
    }, { status: 500 });
  }
}
