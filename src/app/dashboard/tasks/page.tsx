'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Loader2,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Eye
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
  child: {
    id: string;
    nickname: string;
    grade: string | null;
  };
  subject: {
    id: string;
    name: string;
    code: string;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: '待完成', color: 'bg-blue-100 text-blue-700', icon: <Clock className="h-4 w-4" /> },
  IN_PROGRESS: { label: '进行中', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-4 w-4" /> },
  PENDING_CONFIRM: { label: '待确认', color: 'bg-orange-100 text-orange-700', icon: <AlertCircle className="h-4 w-4" /> },
  COMPLETED: { label: '已完成', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-4 w-4" /> },
  OVERDUE: { label: '已逾期', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-4 w-4" /> },
  CANCELLED: { label: '已取消', color: 'bg-gray-100 text-gray-700', icon: <XCircle className="h-4 w-4" /> },
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/practice/tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('获取任务列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (taskId: string) => {
    setConfirming(taskId);
    try {
      const res = await fetch(`/api/practice/tasks/${taskId}/confirm`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('确认失败:', error);
    } finally {
      setConfirming(null);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('确定要删除这个任务吗？')) return;
    try {
      const res = await fetch(`/api/practice/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const filteredTasks = filter
    ? tasks.filter(t => t.status === filter)
    : tasks;

  const getStatusStats = () => {
    const stats = {
      all: tasks.length,
      pending: tasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length,
      pendingConfirm: tasks.filter(t => t.status === 'PENDING_CONFIRM').length,
      completed: tasks.filter(t => t.status === 'COMPLETED').length,
      overdue: tasks.filter(t => t.status === 'OVERDUE').length,
    };
    return stats;
  };

  const stats = getStatusStats();

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/questions">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold">推送记录</h1>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="text-muted-foreground hover:text-foreground">
                返回主页
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* 状态统计 */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={filter === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('')}
          >
            全部 ({stats.all})
          </Button>
          <Button
            variant={filter === 'PENDING' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('PENDING')}
          >
            待完成 ({stats.pending})
          </Button>
          <Button
            variant={filter === 'PENDING_CONFIRM' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('PENDING_CONFIRM')}
            className={stats.pendingConfirm > 0 ? 'animate-pulse' : ''}
          >
            待确认 ({stats.pendingConfirm})
          </Button>
          <Button
            variant={filter === 'COMPLETED' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('COMPLETED')}
          >
            已完成 ({stats.completed})
          </Button>
          <Button
            variant={filter === 'OVERDUE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('OVERDUE')}
          >
            已逾期 ({stats.overdue})
          </Button>
        </div>

        {/* 任务列表 */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <Card className="py-12 text-center">
            <Send className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              {filter ? '没有符合条件的任务' : '还没有推送过任务'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {filter ? '尝试调整筛选条件' : '去题库选择题目推送给孩子吧'}
            </p>
            <Link href="/dashboard/questions">
              <Button>
                <Send className="h-4 w-4 mr-2" />
                去题库推送
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTasks.map((task) => {
              const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;
              return (
                <Card key={task.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      {/* 内容区域 */}
                      <div className="flex-1 min-w-0">
                        {/* 标题和状态 */}
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{task.title}</h3>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${statusConfig.color}`}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>
                        </div>

                        {/* 信息行 */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Send className="h-3 w-3" />
                            {task.child.nickname}
                            {task.child.grade && ` (${task.child.grade})`}
                          </span>
                          <span>{task.questionCount} 道题目</span>
                          {task.subject && <span>{task.subject.name}</span>}
                          {task.dueDate && (
                            <span className={task.status === 'OVERDUE' ? 'text-red-500' : ''}>
                              <Clock className="h-3 w-3 inline mr-1" />
                              截止 {new Date(task.dueDate).toLocaleDateString('zh-CN')}
                            </span>
                          )}
                        </div>

                        {/* 设置标签 */}
                        <div className="flex items-center gap-2 mt-2">
                          {!task.allowSkip && (
                            <span className="text-xs px-2 py-0.5 rounded bg-orange-50 text-orange-600">
                              禁止跳过
                            </span>
                          )}
                          {task.requireConfirmation && (
                            <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-600">
                              需确认
                            </span>
                          )}
                        </div>

                        {/* 时间信息 */}
                        <p className="text-xs text-muted-foreground mt-2">
                          推送于 {new Date(task.createdAt).toLocaleDateString('zh-CN')}
                          {task.completedAt && ` · 完成于 ${new Date(task.completedAt).toLocaleDateString('zh-CN')}`}
                        </p>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        {/* 待确认状态显示确认按钮 */}
                        {task.status === 'PENDING_CONFIRM' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleConfirm(task.id)}
                            disabled={confirming === task.id}
                          >
                            {confirming === task.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                确认完成
                              </>
                            )}
                          </Button>
                        )}

                        <Link href={`/dashboard/tasks/${task.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>

                        {/* 未完成的任务可以删除 */}
                        {task.status !== 'COMPLETED' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(task.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
