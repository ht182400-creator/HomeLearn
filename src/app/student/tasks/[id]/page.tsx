'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  BookOpen,
  Eye,
  EyeOff,
  XCircle
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
  answers?: Record<string, any>;
  questions: {
    id: string;
    type: string;
    content: any;
    difficulty: number;
    metadata?: {
      options?: { label: string; content: string }[];
    };
    answer?: any;
  }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  PENDING: { label: '待完成', color: 'text-blue-700', bgColor: 'bg-blue-50', icon: <Clock className="h-5 w-5" /> },
  PENDING_CONFIRM: { label: '等待确认', color: 'text-orange-700', bgColor: 'bg-orange-50', icon: <AlertCircle className="h-5 w-5" /> },
  COMPLETED: { label: '已完成', color: 'text-green-700', bgColor: 'bg-green-50', icon: <CheckCircle2 className="h-5 w-5" /> },
  OVERDUE: { label: '已逾期', color: 'text-red-700', bgColor: 'bg-red-50', icon: <AlertCircle className="h-5 w-5" /> },
};

/**
 * 获取选项文本
 */
const getOptionText = (question: Task['questions'][0], answer: string) => {
  const options = question.metadata?.options;
  if (!options) return answer;
  const option = options.find((o) => o.label === answer);
  return option ? `${answer}. ${option.content.replace(/<[^>]*>/g, '')}` : answer;
};

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewingQuestion, setViewingQuestion] = useState<Task['questions'][0] | null>(null);

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  const fetchTask = async () => {
    try {
      const res = await fetch(`/api/practice/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setTask(data);
      }
    } catch (error) {
      console.error('获取任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getContentText = (content: any) => {
    if (!content) return '';
    if (typeof content === 'string') {
      return content.replace(/<[^>]*>/g, '').trim();
    }
    if (content?.blocks) {
      return content.blocks.map((b: any) => b.content).join(' ').replace(/<[^>]*>/g, '');
    }
    return '';
  };

  const getQuestionType = (type: string) => {
    const types: Record<string, string> = {
      SINGLE_CHOICE: '单选题',
      MULTIPLE_CHOICE: '多选题',
      TRUE_FALSE: '判断题',
      FILL_BLANK: '填空题',
      SHORT_ANSWER: '简答题',
      CALCULATION: '计算题',
      PROOF: '证明题',
    };
    return types[type] || '解答题';
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
        <Card className="p-8 text-center">
          <h2 className="text-lg font-medium mb-4">任务不存在</h2>
          <Link href="/student/tasks">
            <Button>返回任务列表</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/student/tasks">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">任务详情</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* 任务概览 */}
        <Card className={`${statusConfig.bgColor} border-2 mb-6`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <span className={statusConfig.color}>{statusConfig.icon}</span>
              <span className={`font-semibold ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>

            <h2 className="text-2xl font-bold mb-4">{task.title}</h2>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">题目数量：</span>
                <span className="font-medium">{task.questionCount} 道</span>
              </div>
              <div>
                <span className="text-muted-foreground">发布时间：</span>
                <span className="font-medium">
                  {new Date(task.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
              {task.dueDate && (
                <div>
                  <span className="text-muted-foreground">截止日期：</span>
                  <span className="font-medium">
                    {new Date(task.dueDate).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              )}
              {task.completedAt && (
                <div>
                  <span className="text-muted-foreground">完成时间：</span>
                  <span className="font-medium">
                    {new Date(task.completedAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              )}
            </div>

            {/* 标签 */}
            <div className="flex items-center gap-2 mt-4">
              {!task.allowSkip && (
                <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700">
                  必须按顺序作答
                </span>
              )}
              {task.requireConfirmation && (
                <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">
                  完成后需家长确认
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 题目列表 */}
        <h3 className="font-semibold mb-4">题目列表</h3>
        <div className="space-y-3">
          {task.questions.map((question, index) => {
            const childAnswer = task.answers?.[question.id];
            const hasAnswer = childAnswer !== undefined && childAnswer !== null && childAnswer !== '';
            return (
              <Card key={question.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="line-clamp-2">
                        {getContentText(question.content)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getQuestionType(question.type)}
                      </p>
                      {/* 显示孩子的答案 */}
                      {hasAnswer && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-700">
                            <span className="font-medium">我的答案：</span>
                            {typeof childAnswer === 'string' ? childAnswer : JSON.stringify(childAnswer)}
                          </p>
                        </div>
                      )}
                    </div>
                    {/* 查看详情按钮 - 根据对错显示不同颜色 */}
                    {(() => {
                      const childAnswer = task.answers?.[question.id];
                      const correctAnswer = question.answer;
                      const hasAnswer = childAnswer !== undefined && childAnswer !== null && childAnswer !== '';
                      const isCorrect = hasAnswer && correctAnswer && 
                        String(childAnswer).trim().toUpperCase() === String(correctAnswer).trim().toUpperCase();
                      const isWrong = hasAnswer && correctAnswer && !isCorrect;
                      
                      return (
                        <button
                          onClick={() => setViewingQuestion(question)}
                          className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title="查看题目详情"
                        >
                          {isCorrect ? (
                            <Eye className="h-5 w-5 text-green-500" />
                          ) : isWrong ? (
                            <EyeOff className="h-5 w-5 text-red-500" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 底部操作 */}
        <div className="mt-8">
          {task.status === 'PENDING' || task.status === 'OVERDUE' ? (
            <Link href={`/student/tasks/${taskId}/practice`} className="block">
              <Button className="w-full" size="lg">
                {task.status === 'OVERDUE' ? '继续作答' : '开始作答'}
              </Button>
            </Link>
          ) : task.status === 'PENDING_CONFIRM' ? (
            <div className="text-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p className="font-medium">已完成，等待家长确认</p>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p className="font-medium">任务已完成</p>
            </div>
          )}
        </div>

        {/* 题目详情弹窗 */}
        {viewingQuestion && (
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setViewingQuestion(null)}
          >
            <div 
              className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">题目详情</h3>
                <button
                  onClick={() => setViewingQuestion(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="h-5 w-5 text-gray-400" />
                </button>
              </div>
              
              {/* 题目内容 */}
              <div className="mb-6">
                {typeof viewingQuestion.content === 'string' ? (
                  <div 
                    className="text-base leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: viewingQuestion.content }} 
                  />
                ) : (
                  <p className="text-base leading-relaxed">
                    {getContentText(viewingQuestion.content)}
                  </p>
                )}
              </div>

              {/* 选项（选择题）- 学生端：显示已选择答案，不显示正确答案 */}
              {(viewingQuestion.type === 'SINGLE_CHOICE' || viewingQuestion.type === 'TRUE_FALSE') && (
                <div className="space-y-2 mb-6">
                  {viewingQuestion.metadata?.options?.map((option) => {
                    const childAnswer = task.answers?.[viewingQuestion.id];
                    const isSelected = childAnswer && String(childAnswer).trim().toUpperCase() === option.label.toUpperCase();
                    return (
                      <div 
                        key={option.label}
                        className={`p-3 rounded-lg border-2 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <span className="font-medium mr-2">{option.label}.</span>
                        <span dangerouslySetInnerHTML={{ __html: option.content }} />
                        {isSelected && (
                          <span className="ml-2 text-blue-600 text-sm font-medium">✓ 已选择</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 填空/简答题答案 - 学生端只显示自己的答案 */}
              {(viewingQuestion.type === 'FILL_BLANK' || viewingQuestion.type === 'SHORT_ANSWER') && task.answers?.[viewingQuestion.id] && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">已提交答案：</span>
                    {task.answers[viewingQuestion.id]}
                  </p>
                </div>
              )}

              {/* 学生端：显示答案已提交提示 */}
              {task.answers?.[viewingQuestion.id] ? (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <CheckCircle2 className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                  <p className="text-blue-700 font-medium">答案已提交，等待家长确认</p>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                  <p className="text-gray-500 text-sm">未找到答案记录</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
