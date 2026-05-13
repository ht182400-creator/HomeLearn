'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Edit2, 
  Trash2, 
  User,
  Loader2,
  GraduationCap,
  BookOpen,
  Target,
  Clock,
  TrendingUp,
  BarChart3,
  Mic,
  AlertCircle,
  CheckCircle2,
  Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GRADE_LABELS } from '@/lib/utils';

interface ChildStats {
  totalStudyTime: number;
  totalPractice: number;
  totalCorrect: number;
  wrongCount: number;
  reviewDue: number;
  speechCount: number;
}

interface Child {
  id: string;
  nickname: string;
  grade: string | null;
  avatar: string | null;
  username: string | null;
  passwordHash: string | null;
  createdAt: string;
  // 统计数据
  stats?: ChildStats;
}

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createLogin, setCreateLogin] = useState(false);
  const [formData, setFormData] = useState({
    nickname: '',
    grade: '',
    username: '',
    password: '',
  });
  const [savedLoginInfo, setSavedLoginInfo] = useState<{ username: string; password: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const res = await fetch('/api/children?includeStats=true');
      const data = await res.json();
      setChildren(data);
    } catch (error) {
      console.error('获取孩子列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证年级必填
    if (!formData.grade) {
      alert('请选择年级');
      return;
    }

    // 如果创建登录账户，需要填写用户名和密码
    if (createLogin) {
      if (!formData.username) {
        alert('请输入孩子登录用户名');
        return;
      }
      if (!formData.password) {
        alert('请输入孩子登录密码');
        return;
      }
      if (formData.password.length < 4) {
        alert('密码至少4个字符');
        return;
      }
    }
    
    setSaving(true);

    try {
      // 只有新创建时才发送登录信息
      const payload: any = {
        nickname: formData.nickname,
        grade: formData.grade,
      };

      if (!editingId && createLogin) {
        payload.username = formData.username;
        payload.password = formData.password;
      }

      const url = editingId ? `/api/children/${editingId}` : '/api/children';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        
        // 如果是新建且设置了登录信息，保存登录信息用于显示
        if (!editingId && data.loginInfo) {
          setSavedLoginInfo(data.loginInfo);
        }
        
        setFormData({ nickname: '', grade: '', username: '', password: '' });
        setShowForm(false);
        setEditingId(null);
        setCreateLogin(false);
        fetchChildren();
      } else {
        const error = await res.json();
        alert(error.error || '保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (child: Child) => {
    setFormData({ nickname: child.nickname, grade: child.grade || '', username: '', password: '' });
    setEditingId(child.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个孩子账户吗？所有相关数据将被删除。')) return;
    
    try {
      await fetch(`/api/children/${id}`, { method: 'DELETE' });
      fetchChildren();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">孩子账户管理</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Add Button */}
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="mb-6">
            <Plus className="h-4 w-4 mr-2" />
            添加孩子
          </Button>
        )}

        {/* Form */}
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingId ? '编辑孩子信息' : '添加新孩子'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nickname">昵称</Label>
                  <Input
                    id="nickname"
                    placeholder="例如：小明"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">年级</Label>
                  <select
                    id="grade"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  >
                    <option value="">请选择年级</option>
                    {Object.entries(GRADE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* 孩子登录账户选项 - 仅新建时显示 */}
                {!editingId && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <input
                        type="checkbox"
                        id="createLogin"
                        checked={createLogin}
                        onChange={(e) => setCreateLogin(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="createLogin" className="cursor-pointer">
                        创建孩子独立登录账户
                      </Label>
                    </div>
                    
                    {createLogin && (
                      <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                        <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm">
                          孩子可以使用自己的用户名和密码登录，只能看到自己的学习数据
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="username">登录用户名</Label>
                          <Input
                            id="username"
                            placeholder="孩子登录用的用户名"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">登录密码</Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="至少4个字符"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingId ? '保存修改' : '添加'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setFormData({ nickname: '', grade: '', username: '', password: '' });
                      setCreateLogin(false);
                    }}
                  >
                    取消
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* 显示保存的登录信息 */}
        {savedLoginInfo && (
          <Card className="mb-8 border-green-500 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-green-800 mb-2">✓ 孩子账户已创建！</h3>
                  <p className="text-sm text-green-700 mb-3">
                    请告诉孩子以下登录信息：
                  </p>
                  <div className="bg-white p-3 rounded border border-green-200">
                    <p className="text-sm"><strong>用户名：</strong>{savedLoginInfo.username}</p>
                    <p className="text-sm"><strong>密码：</strong>{savedLoginInfo.password}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSavedLoginInfo(null)}
                >
                  知道了
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Children List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : children.length === 0 ? (
          <Card className="py-12 text-center">
            <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">还没有添加孩子</h3>
            <p className="text-muted-foreground mb-4">
              添加孩子账户，开始管理他们的学习
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              添加第一个孩子
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {children.map((child) => (
              <Card key={child.id} className="relative overflow-hidden">
                {/* 顶部渐变装饰条 */}
                <div className="h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                
                <CardContent className="pt-5">
                  {/* 头部：头像 + 基本信息 */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center shadow-sm">
                        {child.avatar ? (
                          <img src={child.avatar} alt={child.nickname} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <GraduationCap className="h-7 w-7 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{child.nickname}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {child.grade ? GRADE_LABELS[child.grade] : '未设置年级'}
                        </p>
                      </div>
                    </div>
                    {/* 登录状态标签 */}
                    {child.username ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <Key className="h-3 w-3 mr-1" />
                        已开通
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        未开通
                      </Badge>
                    )}
                  </div>

                  {/* 学习统计卡片 */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {/* 学习时长 */}
                    <div className="bg-blue-50 rounded-lg p-2.5">
                      <div className="flex items-center gap-1.5 text-blue-700 text-xs font-medium mb-1">
                        <Clock className="h-3.5 w-3.5" />
                        累计学习
                      </div>
                      <p className="text-lg font-bold text-blue-900">
                        {child.stats?.totalStudyTime 
                          ? `${Math.floor(child.stats.totalStudyTime / 60)}h${child.stats.totalStudyTime % 60}m`
                          : '0h'}
                      </p>
                    </div>
                    
                    {/* 练习次数 */}
                    <div className="bg-purple-50 rounded-lg p-2.5">
                      <div className="flex items-center gap-1.5 text-purple-700 text-xs font-medium mb-1">
                        <Target className="h-3.5 w-3.5" />
                        练习次数
                      </div>
                      <p className="text-lg font-bold text-purple-900">
                        {child.stats?.totalPractice || 0}
                      </p>
                    </div>
                    
                    {/* 正确率 */}
                    <div className="bg-green-50 rounded-lg p-2.5">
                      <div className="flex items-center gap-1.5 text-green-700 text-xs font-medium mb-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        正确数
                      </div>
                      <p className="text-lg font-bold text-green-900">
                        {child.stats?.totalCorrect || 0}
                      </p>
                    </div>
                    
                    {/* 待复习 */}
                    <div className="bg-rose-50 rounded-lg p-2.5">
                      <div className="flex items-center gap-1.5 text-rose-700 text-xs font-medium mb-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        待复习
                      </div>
                      <p className="text-lg font-bold text-rose-900">
                        {child.stats?.reviewDue || 0}
                      </p>
                    </div>
                  </div>

                  {/* 正确率进度条 */}
                  {child.stats && child.stats.totalPractice > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">正确率</span>
                        <span className="font-medium">
                          {child.stats.totalPractice > 0 
                            ? Math.round((child.stats.totalCorrect / child.stats.totalPractice) * 100)
                            : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={child.stats.totalPractice > 0 
                          ? (child.stats.totalCorrect / child.stats.totalPractice) * 100
                          : 0} 
                        className="h-2"
                      />
                    </div>
                  )}

                  {/* 快捷操作 */}
                  <div className="border-t pt-3 flex gap-2">
                    <Link href={`/dashboard/review?child=${child.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1">
                        <BookOpen className="h-3.5 w-3.5" />
                        错题本
                        {child.stats?.wrongCount ? (
                          <Badge variant="secondary" className="ml-1 text-xs">
                            {child.stats.wrongCount}
                          </Badge>
                        ) : null}
                      </Button>
                    </Link>
                    <Link href={`/dashboard/speech?child=${child.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1">
                        <Mic className="h-3.5 w-3.5" />
                        口语
                        {child.stats?.speechCount ? (
                          <Badge variant="secondary" className="ml-1 text-xs">
                            {child.stats.speechCount}
                          </Badge>
                        ) : null}
                      </Button>
                    </Link>
                  </div>

                  {/* 底部操作栏 */}
                  <div className="mt-3 pt-3 border-t flex justify-end gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEdit(child)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" />
                      编辑
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(child.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      删除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
