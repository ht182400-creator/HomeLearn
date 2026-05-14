/**
 * CodeBuddy OAuth 登录页面
 * 用户访问此页面，在浏览器中完成登录后，token 会自动保存
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface AuthStatus {
  status: 'idle' | 'starting' | 'polling' | 'success' | 'error' | 'expired';
  message: string;
  authUrl?: string;
  authState?: string;
  userId?: string;
  filename?: string;
  expiresIn?: number;
  error?: string;
}

export default function CodeBuddyLoginPage() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    status: 'idle',
    message: '准备启动认证...',
  });

  const [pollingInterval, setPollingInterval] = useState<number>(3);

  const startAuth = useCallback(async () => {
    setAuthStatus({ status: 'starting', message: '正在启动认证流程...' });

    try {
      const response = await fetch('/api/codebuddy/auth');
      
      if (!response.ok) {
        throw new Error(`启动失败: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setAuthStatus({
          status: 'polling',
          message: '等待登录确认...',
          authUrl: data.auth_url,
          authState: data.auth_state,
        });
        setPollingInterval(data.interval || 3);
      } else {
        throw new Error(data.message || '启动认证失败');
      }
    } catch (e: any) {
      setAuthStatus({
        status: 'error',
        message: '启动认证失败',
        error: e.message,
      });
    }
  }, []);

  const pollAuthStatus = useCallback(async (authState: string) => {
    try {
      const response = await fetch('/api/codebuddy/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_state: authState }),
      });

      if (!response.ok) {
        throw new Error(`轮询失败: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success') {
        setAuthStatus({
          status: 'success',
          message: '登录成功！Token 已自动保存',
          userId: data.user_id,
          filename: data.filename,
          expiresIn: data.expires_in,
        });
        return true; // 停止轮询
      } else if (data.status === 'pending') {
        setAuthStatus(prev => ({
          ...prev,
          message: data.message || '等待登录中...',
        }));
      } else {
        throw new Error(data.message || '认证失败');
      }
    } catch (e: any) {
      setAuthStatus({
        status: 'error',
        message: '认证失败',
        error: e.message,
      });
      return true; // 停止轮询
    }

    return false; // 继续轮询
  }, []);

  useEffect(() => {
    if (authStatus.status === 'starting') {
      startAuth();
    }
  }, [authStatus.status, startAuth]);

  useEffect(() => {
    if (authStatus.status === 'polling' && authStatus.authState) {
      const intervalId = setInterval(async () => {
        const shouldStop = await pollAuthStatus(authStatus.authState!);
        if (shouldStop) {
          clearInterval(intervalId);
        }
      }, pollingInterval * 1000);

      // 立即执行一次
      pollAuthStatus(authStatus.authState);

      return () => clearInterval(intervalId);
    }
  }, [authStatus.status, authStatus.authState, pollingInterval, pollAuthStatus]);

  const handleRetry = () => {
    setAuthStatus({ status: 'starting', message: '重新启动认证...' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* 头部 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            CodeBuddy 授权登录
          </h1>
          <p className="text-gray-600">
            只需登录一次，后续自动续期，无需人工干预
          </p>
        </div>

        {/* 状态卡片 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* 状态图标 */}
          <div className="flex justify-center mb-6">
            {authStatus.status === 'idle' || authStatus.status === 'starting' ? (
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
            ) : authStatus.status === 'polling' ? (
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-blue-200 rounded-full" />
                <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin" />
                <div className="absolute inset-2 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">⏳</span>
                </div>
              </div>
            ) : authStatus.status === 'success' ? (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-3xl">✅</span>
              </div>
            ) : authStatus.status === 'error' || authStatus.status === 'expired' ? (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-3xl">❌</span>
              </div>
            ) : null}
          </div>

          {/* 状态消息 */}
          <div className="text-center mb-6">
            <p className="text-lg font-medium text-gray-800 mb-1">
              {authStatus.status === 'idle' ? '准备中...' : ''}
              {authStatus.status === 'starting' ? '启动中...' : ''}
              {authStatus.status === 'polling' ? '等待确认' : ''}
              {authStatus.status === 'success' ? '登录成功' : ''}
              {authStatus.status === 'error' ? '登录失败' : ''}
              {authStatus.status === 'expired' ? '登录超时' : ''}
            </p>
            <p className="text-gray-600 text-sm">{authStatus.message}</p>
          </div>

          {/* 错误详情 */}
          {authStatus.error && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-red-700 text-sm font-mono">{authStatus.error}</p>
            </div>
          )}

          {/* 登录链接 */}
          {authStatus.status === 'polling' && authStatus.authUrl && (
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2 text-center">
                请在浏览器中完成登录：
              </p>
              <a
                href={authStatus.authUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border-2 border-blue-300 text-blue-700 text-center font-medium transition-colors"
              >
                🔗 点击打开 CodeBuddy 登录页面
              </a>
              <p className="text-xs text-gray-500 mt-2 text-center">
                或复制链接到浏览器打开
              </p>
              <input
                type="text"
                readOnly
                value={authStatus.authUrl}
                className="mt-2 w-full p-2 text-xs bg-gray-100 rounded border border-gray-300"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>
          )}

          {/* 成功信息 */}
          {authStatus.status === 'success' && (
            <div className="mb-6">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center mb-2">
                  <span className="text-xl mr-2">🎉</span>
                  <span className="font-medium text-green-800">授权成功</span>
                </div>
                <div className="text-sm text-green-700 space-y-1">
                  <p>用户: <span className="font-mono">{authStatus.userId}</span></p>
                  <p>文件: <span className="font-mono text-xs">{authStatus.filename}</span></p>
                  <p>有效期: <span className="font-mono">{authStatus.expiresIn ? Math.round(authStatus.expiresIn / 3600) : 24} 小时</span></p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Token 已自动保存到 .codebuddy_creds 目录<br/>
                之后会自动续期，无需任何操作
              </p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3">
            {(authStatus.status === 'idle' || authStatus.status === 'starting') && (
              <button
                onClick={startAuth}
                disabled={authStatus.status === 'starting'}
                className="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium rounded-lg transition-colors"
              >
                {authStatus.status === 'starting' ? '启动中...' : '开始授权'}
              </button>
            )}

            {(authStatus.status === 'error' || authStatus.status === 'expired') && (
              <button
                onClick={handleRetry}
                className="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
              >
                重新授权
              </button>
            )}

            {authStatus.status === 'success' && (
              <Link
                href="/dashboard"
                className="flex-1 py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg text-center transition-colors"
              >
                返回 Dashboard
              </Link>
            )}

            {authStatus.status === 'polling' && (
              <button
                onClick={handleRetry}
                className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
              >
                重新开始
              </button>
            )}
          </div>
        </div>

        {/* 提示信息 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>这是安全的 OAuth 授权流程</p>
          <p>Token 仅保存在本地，不会上传到任何服务器</p>
        </div>

        {/* 底部链接 */}
        <div className="mt-4 text-center">
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
