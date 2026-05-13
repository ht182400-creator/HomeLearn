"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { BookOpen, Loader2, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

type LoginType = 'parent' | 'child';

export default function LoginPage() {
  const [loginType, setLoginType] = useState<LoginType>('parent');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setEmailError('');
    setPasswordError('');
    setError('');
    
    let hasError = false;
    if (!email.trim()) {
      setEmailError('请输入用户名或邮箱');
      hasError = true;
    }
    if (!password) {
      setPasswordError('请输入密码');
      hasError = true;
    }
    if (hasError) return;
    
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        login: email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('用户名或密码错误');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleChildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setEmailError('');
    setPasswordError('');
    setError('');
    
    let hasError = false;
    if (!email.trim()) {
      setEmailError('请输入用户名');
      hasError = true;
    }
    if (!password) {
      setPasswordError('请输入密码');
      hasError = true;
    }
    if (hasError) return;
    
    setLoading(true);

    try {
      const res = await fetch('/api/auth/child-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '登录失败');
      } else {
        router.push('/student');
        router.refresh();
      }
    } catch {
      setError('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="space-y-1 pb-2">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center font-bold">欢迎来到甜家学</CardTitle>
          <CardDescription className="text-center text-base">
            {loginType === 'parent' ? '家长账户登录' : '孩子账户登录'}
          </CardDescription>
        </CardHeader>
        
        {/* 登录类型切换 */}
        <div className="px-6 pb-4">
          <div className="flex bg-muted rounded-lg p-1">
            <button
              type="button"
              onClick={() => { setLoginType('parent'); setEmail(''); setPassword(''); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                loginType === 'parent'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="h-4 w-4" />
              我是家长
            </button>
            <button
              type="button"
              onClick={() => { setLoginType('child'); setEmail(''); setPassword(''); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                loginType === 'child'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="h-4 w-4" />
              我是孩子
            </button>
          </div>
        </div>

        <form onSubmit={loginType === 'parent' ? handleParentSubmit : handleChildSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
                <span className="w-2 h-2 bg-destructive rounded-full"></span>
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                {loginType === 'parent' ? '用户名 / 邮箱' : '用户名'}
              </Label>
              <Input
                id="username"
                type="text"
                placeholder={loginType === 'parent' ? '请输入用户名或邮箱' : '请输入你的用户名'}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                required
                autoComplete="off"
                className={`h-11 ${emailError ? 'border-destructive' : ''}`}
              />
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                required
                autoComplete="off"
                className={`h-11 ${passwordError ? 'border-destructive' : ''}`}
              />
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button type="submit" className="w-full h-11 text-base font-medium" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loginType === 'parent' ? '登录' : '开始学习'}
            </Button>
            
            {loginType === 'parent' ? (
              <p className="text-sm text-muted-foreground text-center">
                还没有账户？
                <Link href="/register" className="text-primary hover:underline font-medium ml-1">
                  立即注册
                </Link>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                还没有学习账户？
                <Link href="/register" className="text-primary hover:underline font-medium ml-1">
                  让爸爸妈妈帮你注册
                </Link>
              </p>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
