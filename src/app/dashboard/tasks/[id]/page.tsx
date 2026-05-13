'use client';

/**
 * 任务详情页面（家长端）
 * @description 查看学生提交的答案，逐题对比审批
 */
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  User,
  BookOpen,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Question {
  id: string;
  type: string;
  content: string;
  answer: any;
  metadata: any;
  difficulty: string;
}

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  questionCount: number;
  allowSkip: boolean;
  requireConfirmation: boolean;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  answers: Record<string, any>;
  questions: Question[];
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

/**
 * 获取题目类型标签
 */
function getQuestionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    SINGLE_CHOICE: '单选题',
    MULTIPLE_CHOICE: '多选题',
    TRUE_FALSE: '判断题',
    FILL_BLANK: '填空题',
    SHORT_ANSWER: '简答题',
  };
  return labels[type] || type;
}

/**
 * 获取难度标签
 */
function getDifficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    EASY: '简单',
    MEDIUM: '中等',
    HARD: '困难',
  };
  return labels[difficulty] || difficulty;
}

/**
 * 获取难度颜色
 */
function getDifficultyColor(difficulty: string): string {
  const colors: Record<string, string> = {
    EASY: 'bg-green-100 text-green-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    HARD: 'bg-red-100 text-red-700',
  };
  return colors[difficulty] || 'bg-gray-100 text-gray-700';
}

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.id as string;

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (taskId) {
      fetchTask();
    }
  }, [taskId]);

  /**
   * 获取任务详情
   */
  const fetchTask = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/practice/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setTask(data);
      }
    } catch (error) {
      console.error('获取任务详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 确认任务完成
   */
  const handleConfirm = async () => {
    if (!task) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/practice/tasks/${task.id}/confirm`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchTask();
      }
    } catch (error) {
      console.error('确认失败:', error);
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">任务不存在或已被删除</p>
          <Link href="/dashboard/tasks">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回任务列表
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/tasks">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">{task.title}</h1>
                <p className="text-sm text-muted-foreground">任务详情</p>
              </div>
            </div>
            {/* 待确认状态显示确认按钮 */}
            {task.status === 'PENDING_CONFIRM' && (
              <Button
                onClick={handleConfirm}
                disabled={confirming}
                className="bg-green-600 hover:bg-green-700"
              >
                {confirming ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                确认完成
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* 任务信息卡片 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* 状态 */}
              <span className={`inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full ${statusConfig.color}`}>
                {statusConfig.icon}
                {statusConfig.label}
              </span>
              {/* 孩子信息 */}
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {task.child.nickname}
                {task.child.grade && ` (${task.child.grade})`}
              </span>
              {/* 学科 */}
              {task.subject && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  {task.subject.name}
                </span>
              )}
              {/* 题目数量 */}
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Send className="h-4 w-4" />
                {task.questionCount} 道题目
              </span>
              {/* 完成时间 */}
              {task.completedAt && (
                <span className="text-sm text-muted-foreground">
                  完成于 {new Date(task.completedAt).toLocaleString('zh-CN')}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 题目列表 */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">题目与答案</h2>
          {task.questions.map((question, index) => {
            const childAnswer = task.answers?.[question.id];
            const hasAnswer = childAnswer !== undefined && childAnswer !== null;

            return (
              <Card key={question.id} className="overflow-hidden">
                <CardContent className="pt-6">
                  {/* 题目标题 */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="bg-primary text-white text-sm font-medium w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <div>
                        <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor(question.difficulty)}`}>
                          {getDifficultyLabel(question.difficulty)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {getQuestionTypeLabel(question.type)}
                        </span>
                      </div>
                    </div>
                    {/* 答题状态 */}
                    {hasAnswer ? (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        已作答
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        未作答
                      </span>
                    )}
                  </div>

                  {/* 题目内容 */}
                  <div
                    className="mb-4 text-base leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: question.content }}
                  />

                  {/* 选项（选择题） */}
                  {(question.type === 'SINGLE_CHOICE' || question.type === 'TRUE_FALSE') && (
                    <div className="space-y-2 mb-4">
                      {question.metadata?.options?.map((option: any) => {
                        const isSelected = hasAnswer &&
                          String(childAnswer).trim().toUpperCase() === option.label.toUpperCase();
                        const isCorrect = question.answer &&
                          String(question.answer).trim().toUpperCase() === option.label.toUpperCase();

                        return (
                          <div
                            key={option.label}
                            className={`p-3 rounded-lg border-2 ${
                              isCorrect
                                ? 'border-green-500 bg-green-50'
                                : isSelected && !isCorrect
                                  ? 'border-red-500 bg-red-50'
                                  : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{option.label}.</span>
                                <span dangerouslySetInnerHTML={{ __html: option.content }} />
                              </div>
                              {/* 标签 */}
                              <div className="flex items-center gap-2">
                                {isCorrect && (
                                  <span className="text-xs text-green-600 font-medium">✓ 正确答案</span>
                                )}
                                {isSelected && !isCorrect && (
                                  <span className="text-xs text-red-600 font-medium">✗ 学生选择</span>
                                )}
                                {isSelected && isCorrect && (
                                  <span className="text-xs text-green-600 font-medium">✓ 学生答对</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 填空/简答题 */}
                  {(question.type === 'FILL_BLANK' || question.type === 'SHORT_ANSWER') && (
                    <div className="space-y-3">
                      {/* 学生答案 */}
                      {hasAnswer ? (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-700">
                            <span className="font-medium">学生答案：</span>
                            {String(childAnswer)}
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-500">学生未作答</p>
                        </div>
                      )}
                      {/* 正确答案 */}
                      {question.answer && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-sm text-green-700">
                            <span className="font-medium">参考答案：</span>
                            {typeof question.answer === 'string'
                              ? question.answer
                              : JSON.stringify(question.answer)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 答案对比结果 */}
                  {hasAnswer && question.answer && (
                    <div className="mt-4">
                      {(() => {
                        const childAns = String(childAnswer).trim();
                        const correctAns = String(question.answer).trim();
                        const isCorrect = childAns.toUpperCase() === correctAns.toUpperCase();
                        return isCorrect ? (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                            <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1" />
                            <p className="text-green-700 text-sm font-medium">回答正确 ✓</p>
                          </div>
                        ) : (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                            <XCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                            <p className="text-red-700 text-sm font-medium">回答错误 ✗</p>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
