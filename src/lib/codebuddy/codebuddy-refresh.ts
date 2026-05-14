/**
 * CodeBuddy Token 自动刷新器
 * 
 * 功能：
 * - 检测 token 是否快过期
 * - 自动使用 refresh_token 刷新 bearer_token
 * - 刷新后自动保存到文件
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { getCredentialsDir } from './codebuddy-native';

// ============ 常量 ============

const CODEBUDDY_BASE_URL = 'https://www.codebuddy.cn';
const CODEBUDDY_AUTH_TOKEN_ENDPOINT = `${CODEBUDDY_BASE_URL}/v2/plugin/auth/token`;

// 提前刷新时间（秒）- 提前 10 分钟认为快过期
const REFRESH_BUFFER_TIME = 600;

// 刷新锁，防止并发刷新
let _isRefreshing = false;
let _refreshPromise: Promise<boolean> | null = null;

// ============ 类型定义 ============

export interface RefreshResult {
  success: boolean;
  refreshed: boolean;
  credential?: any;
  error?: string;
  message: string;
}

// ============ 辅助函数 ============

function generateHeaders(): Record<string, string> {
  const requestId = crypto.randomUUID().replace(/-/g, '');
  return {
    'Host': 'www.codebuddy.cn',
    'Accept': 'application/json, text/plain, */*',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Connection': 'close',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Request-ID': requestId,
    'X-Domain': 'www.codebuddy.cn',
    'User-Agent': 'CLI/1.0.8 CodeBuddy/1.0.8',
    'X-Product': 'SaaS',
  };
}

/**
 * 检查 token 是否快过期
 */
export function isTokenExpiringSoon(credential: any): boolean {
  const { created_at, expires_in, refresh_token } = credential;
  
  // 如果没有过期时间，假设未过期
  if (!created_at || !expires_in) {
    return false;
  }
  
  // 如果没有 refresh_token，无法刷新
  if (!refresh_token) {
    return false;
  }
  
  const currentTime = Math.floor(Date.now() / 1000);
  const expiryTime = created_at + expires_in;
  const timeRemaining = expiryTime - currentTime;
  
  // 如果剩余时间少于 buffer 时间，认为快过期
  return timeRemaining <= REFRESH_BUFFER_TIME;
}

/**
 * 检查 token 是否已过期
 */
export function isTokenExpired(credential: any): boolean {
  const { created_at, expires_in } = credential;
  
  if (!created_at || !expires_in) {
    return false;
  }
  
  const currentTime = Math.floor(Date.now() / 1000);
  const expiryTime = created_at + expires_in;
  
  return currentTime >= expiryTime;
}

/**
 * 使用 refresh_token 刷新 bearer_token
 */
export async function refreshToken(refreshToken: string): Promise<{
  success: boolean;
  newToken?: string;
  newRefreshToken?: string;
  expiresIn?: number;
  error?: string;
}> {
  try {
    console.log('[CodeBuddy Refresh] 开始刷新 token...');
    
    // CodeBuddy 可能不支持标准的 refresh_token 刷新
    // 这里尝试调用刷新接口
    const headers = generateHeaders();
    
    // 尝试通过 session_state 刷新
    const response = await fetch(`${CODEBUDDY_AUTH_TOKEN_ENDPOINT}?refresh=${refreshToken}`, {
      method: 'GET',
      headers,
    });

    if (response.ok) {
      const result = await response.json();
      
      if (result.code === 0 && result.data?.accessToken) {
        console.log('[CodeBuddy Refresh] Token 刷新成功');
        return {
          success: true,
          newToken: result.data.accessToken,
          newRefreshToken: result.data.refreshToken,
          expiresIn: result.data.expiresIn,
        };
      }
    }
    
    // 如果上面的方式不工作，尝试通过 auth/state 重新获取
    // 注意：这种方式需要用户重新登录，所以只能作为备选
    console.log('[CodeBuddy Refresh] 标准刷新方式不可用，尝试备选方案...');
    
    return {
      success: false,
      error: '刷新方式暂不可用，请手动重新登录',
    };
    
  } catch (e: any) {
    console.error('[CodeBuddy Refresh] Token 刷新失败:', e);
    return {
      success: false,
      error: e.message,
    };
  }
}

/**
 * 解析 JWT 获取用户信息
 */
function parseJwtPayload(token: string): { user_id: string; user_info: Record<string, any> } {
  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return { user_id: 'unknown', user_info: {} };
    }

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
    return { user_id: 'unknown', user_info: {} };
  }
}

/**
 * 保存刷新后的 token 到文件
 */
function saveRefreshedToken(
  filePath: string,
  newToken: string,
  newRefreshToken?: string,
  expiresIn?: number
): boolean {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // 更新 token
    data.bearer_token = newToken;
    data.created_at = Math.floor(Date.now() / 1000);
    
    if (newRefreshToken) {
      data.refresh_token = newRefreshToken;
    }
    
    if (expiresIn) {
      data.expires_in = expiresIn;
    }
    
    // 保留用户信息
    const { user_info } = parseJwtPayload(newToken);
    if (user_info.email && !data.user_info?.email) {
      data.user_info = { ...data.user_info, ...user_info };
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    
    console.log(`[CodeBuddy Refresh] Token 已保存到: ${path.basename(filePath)}`);
    return true;
  } catch (e: any) {
    console.error('[CodeBuddy Refresh] 保存 token 失败:', e);
    return false;
  }
}

/**
 * 刷新指定凭证文件的 token
 */
export async function refreshCredentialToken(filePath: string): Promise<RefreshResult> {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        refreshed: false,
        error: '凭证文件不存在',
        message: `文件不存在: ${filePath}`,
      };
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    if (!data.refresh_token) {
      return {
        success: false,
        refreshed: false,
        error: '凭证没有 refresh_token，无法自动刷新',
        message: '请手动重新登录获取新 token',
      };
    }

    if (!isTokenExpiringSoon(data)) {
      return {
        success: true,
        refreshed: false,
        credential: data,
        message: 'Token 尚未过期，无需刷新',
      };
    }

    console.log(`[CodeBuddy Refresh] Token 即将过期，开始刷新: ${path.basename(filePath)}`);
    
    const refreshResult = await refreshToken(data.refresh_token);
    
    if (!refreshResult.success) {
      return {
        success: false,
        refreshed: false,
        error: refreshResult.error,
        message: `刷新失败: ${refreshResult.error}`,
      };
    }

    // 保存刷新后的 token
    const saved = saveRefreshedToken(
      filePath,
      refreshResult.newToken!,
      refreshResult.newRefreshToken,
      refreshResult.expiresIn
    );

    if (saved) {
      const newData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return {
        success: true,
        refreshed: true,
        credential: newData,
        message: 'Token 刷新成功并已保存',
      };
    } else {
      return {
        success: false,
        refreshed: false,
        error: '保存失败',
        message: 'Token 刷新成功但保存失败',
      };
    }
  } catch (e: any) {
    return {
      success: false,
      refreshed: false,
      error: e.message,
      message: `刷新异常: ${e.message}`,
    };
  }
}

/**
 * 刷新所有需要刷新的凭证（带锁，防止并发）
 */
export async function refreshAllCredentials(credsDir?: string): Promise<{
  total: number;
  refreshed: number;
  failed: number;
  results: RefreshResult[];
}> {
  // 如果正在刷新，等待刷新完成
  if (_isRefreshing && _refreshPromise) {
    console.log('[CodeBuddy Refresh] 正在刷新中，等待完成...');
    await _refreshPromise;
    return { total: 0, refreshed: 0, failed: 0, results: [] };
  }

  _isRefreshing = true;
  
  _refreshPromise = (async () => {
    try {
      const dir = credsDir || getCredentialsDir();
      
      if (!fs.existsSync(dir)) {
        return { total: 0, refreshed: 0, failed: 0, results: [] };
      }

      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'manager_state.json');
      const results: RefreshResult[] = [];

      for (const file of files) {
        const filePath = path.join(dir, file);
        
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          
          // 只处理有 refresh_token 且快过期的凭证
          if (!data.refresh_token) {
            continue;
          }
          
          if (!isTokenExpiringSoon(data)) {
            continue;
          }

          console.log(`[CodeBuddy Refresh] 处理: ${file}`);
          const result = await refreshCredentialToken(filePath);
          results.push(result);
        } catch (e: any) {
          results.push({
            success: false,
            refreshed: false,
            error: e.message,
            message: `处理 ${file} 失败: ${e.message}`,
          });
        }
      }

      return {
        total: files.length,
        refreshed: results.filter(r => r.refreshed).length,
        failed: results.filter(r => !r.success).length,
        results,
      };
    } finally {
      _isRefreshing = false;
      _refreshPromise = null;
    }
  })();

  const result = await _refreshPromise;
  return result;
}

/**
 * 检查凭证状态并提示是否需要刷新
 */
export function checkCredentialsStatus(credentials: any[]): {
  valid: number;
  expiringSoon: number;
  expired: number;
  noRefresh: number;
} {
  let valid = 0;
  let expiringSoon = 0;
  let expired = 0;
  let noRefresh = 0;

  for (const cred of credentials) {
    if (isTokenExpired(cred)) {
      expired++;
    } else if (isTokenExpiringSoon(cred)) {
      if (cred.refresh_token) {
        expiringSoon++;
      } else {
        noRefresh++;
      }
    } else {
      valid++;
    }
  }

  return { valid, expiringSoon, expired, noRefresh };
}
