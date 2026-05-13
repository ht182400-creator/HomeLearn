'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Loader2,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Eye,
  Lock,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Task {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  status: string;
  allowSkip: boolean;
  requireConfirmation: boolean;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  subject: {
    id: string;
    name: string;
    code: string;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  PENDING: { 
    label: '待完成', 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-50 border-blue-200',
    icon: <Clock className="h-5 w-5" /> 
  },
  IN_PROGRESS: { 
    label: '进行中', 
    color: 'text-yellow-700', 
    bgColor: 'bg-yellow-50 border-yellow-200',
    icon: <Clock className="h-5 w-5" /> 
  },
  PENDING_CONFIRM: { 
    label: '等待确认', 
    color: 'text-orange-700', 
    bgColor: 'bg-orange-50 border-orange-200',
    icon: <AlertCircle className="h-5 w-5" /> 
  },
  COMPLETED: { 
    label: '已完成', 
    color: 'text-green-700', 
    bgColor: 'bg-green-50 border-green-200',
    icon: <CheckCircle2 className="h-5 w-5" /> 
  },
  OVERDUE: { 
    label: '已逾期', 
    color: 'text-red-700', 
    bgColor: 'bg-red-50 border-red-200',
    icon: <AlertCircle className="h-5 w-5" /> 
  },
};

export default function StudentTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('active'); // active | pending_confirm | completed
  const [tab, setTab] = useState<'pending' | 'confirmed' | 'history'>('pending');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/practice/tasks/child');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('获取任务列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 根据 tab 筛选任务
  const getFilteredTasks = () => {
    switch (tab) {
      case 'pending':
        return tasks.filter(t => 
          t.status === 'PENDING' || t.status === 'IN_PROGRESS' || t.status === 'OVERDUE'
        );
      case 'confirmed':
        return tasks.filter(t => t.status === 'PENDING_CONFIRM');
      case 'history':
        return tasks.filter(t => t.status === 'COMPLETED');
      default:
        return tasks;
    }
  };

  const filteredTasks = getFilteredTasks();

  // 统计
  const stats = {
    pending: tasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length,
    overdue: tasks.filter(t => t.status === 'OVERDUE').length,
    pendingConfirm: tasks.filter(t => t.status === 'PENDING_CONFIRM').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
  };

  const getDaysLeft = (dueDate: string | null) => {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/student">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">我的任务</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Tab 切换 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex">
            <button
              onClick={() => setTab('pending')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                tab === 'pending' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock className="h-4 w-4" />
              待完成
              {(stats.pending + stats.overdue) > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {stats.pending + stats.overdue}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('confirmed')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                tab === 'confirmed' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <AlertCircle className="h-4 w-4" />
              待确认
              {stats.pendingConfirm > 0 && (
                <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse">
                  {stats.pendingConfirm}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('history')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                tab === 'history' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              已完成
              {stats.completed > 0 && (
                <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {stats.completed}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        {/* 加载状态 */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTasks.length === 0 ? (
          /* 空状态 */
          <Card className="py-12 text-center">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              {tab === 'pending' ? '太棒了！没有待完成的任务' : 
               tab === 'confirmed' ? '暂无待确认的任务' : 
               '还没有已完成的任务'}
            </h3>
            <p className="text-muted-foreground">
              {tab === 'pending' ? '完成的任务会显示在这里' : 
               '家长确认后会显示在这里'}
            </p>
            {tab === 'pending' && (
              <Link href="/student" className="inline-block mt-4">
                <Button variant="outline">
                  <BookOpen className="h-4 w-4 mr-2" />
                  去题库练习
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          /* 任务列表 */
          <div className="space-y-4">
            {filteredTasks.map((task) => {
              const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;
              const daysLeft = getDaysLeft(task.dueDate);
              
              return (
                <Card key={task.id} className={`${statusConfig.bgColor} border-2`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      {/* 状态图标 */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                        task.status === 'COMPLETED' ? 'bg-green-100' : 
                        task.status === 'OVERDUE' ? 'bg-red-100' : 
                        task.status === 'PENDING_CONFIRM' ? 'bg-orange-100' : 
                        'bg-blue-100'
                      }`}>
                        <span className={statusConfig.color}>
                          {statusConfig.icon}
                        </span>
                      </div>

                      {/* 内容 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1">{task.title}</h3>
                        
                        {/* 任务信息 */}
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                          <span>{task.questionCount} 道题目</span>
                          {task.subject && (
                            <span className="px-2 py-0.5 bg-white/50 rounded">{task.subject.name}</span>
                          )}
                        </div>

                        {/* 截止日期 */}
                        {task.dueDate && task.status !== 'COMPLETED' && (
                          <div className={`flex items-center gap-1 text-sm mb-2 ${
                            daysLeft !== null && daysLeft < 0 ? 'text-red-500 font-medium' :
                            daysLeft !== null && daysLeft <= 2 ? 'text-orange-500 font-medium' :
                            'text-muted-foreground'
                          }`}>
                            <Clock className="h-4 w-4" />
                            {daysLeft !== null && daysLeft < 0 
                              ? `已逾期 ${Math.abs(daysLeft)} 天`
                              : daysLeft === 0 
                                ? '今天截止'
                                : daysLeft === 1
                                  ? '明天截止'
                                  : `还有 ${daysLeft} 天`
                            }
                          </div>
                        )}

                        {/* 设置标签 */}
                        <div className="flex items-center gap-2">
                          {!task.allowSkip && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700">
                              <Lock className="h-3 w-3" />
                              必须按顺序作答
                            </span>
                          )}
                          {task.requireConfirmation && task.status !== 'COMPLETED' && (
                            <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                              完成后需确认
                            </span>
                          )}
                          {task.status === 'COMPLETED' && (
                            <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                              家长已确认
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex-shrink-0">
                        {task.status === 'PENDING_CONFIRM' ? (
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">等待确认</p>
                            <Link href={`/student/tasks/${task.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                查看
                              </Button>
                            </Link>
                          </div>
                        ) : task.status === 'COMPLETED' ? (
                          <Link href={`/student/tasks/${task.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              回顾
                            </Button>
                          </Link>
                        ) : (
                          <Link href={`/student/tasks/${task.id}/practice`}>
                            <Button size="sm">
                              <Play className="h-4 w-4 mr-1" />
                              {task.status === 'OVERDUE' ? '继续作答' : '开始作答'}
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
