'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Loader2,
  ArrowRight,
  Send,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

/**
 * 题目选项
 */
interface QuestionOption {
  label: string;
  content: string;
}

/**
 * 题目数据结构
 */
interface Question {
  id: string;
  type: string;
  content: any;
  difficulty: number;
  answer: any;
  metadata?: {
    options?: QuestionOption[];
    [key: string]: any;
  };
}

interface Task {
  id: string;
  title: string;
  questionCount: number;
  allowSkip: boolean;
  questions: Question[];
}

export default function TaskPracticePage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  const { showToast } = useToast();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 当前题目索引
  const [currentIndex, setCurrentIndex] = useState(0);
  // 已完成的题目（可跳过时）
  const [completedQuestions, setCompletedQuestions] = useState<Set<number>>(new Set());
  // 用户的答案
  const [answers, setAnswers] = useState<Record<string, any>>({});

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

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    // 标记当前题目为完成
    setCompletedQuestions(prev => new Set([...prev, currentIndex]));
  };

  const goToQuestion = (index: number) => {
    setCurrentIndex(index);
  };

  const handleSubmit = async () => {
    if (!task) return;

    // 检查是否所有题目都作答了（如果不允许跳过）
    if (!task.allowSkip) {
      const unanswered = task.questions.filter((_, i) => !completedQuestions.has(i));
      if (unanswered.length > 0) {
        showToast(`还有 ${unanswered.length} 道题目未作答，请完成后再提交`, 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/practice/tasks/${taskId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(data.message || '提交成功！', 'success');
        router.push('/student/tasks');
      } else {
        const data = await res.json();
        showToast(data.error || '提交失败', 'error');
      }
    } catch (error) {
      console.error('提交失败:', error);
      showToast('提交失败，请重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 获取题目内容文本
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

  const currentQuestion = task.questions[currentIndex];
  const progress = (completedQuestions.size / task.questionCount) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/student/tasks">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-semibold">{task.title}</h1>
                <p className="text-sm text-muted-foreground">
                  第 {currentIndex + 1} / {task.questionCount} 题
                </p>
              </div>
            </div>

            {/* 进度条 */}
            <div className="flex items-center gap-3">
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground">
                {completedQuestions.size}/{task.questionCount}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* 题目导航 */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2">
              {task.questions.map((q, index) => (
                <button
                  key={q.id}
                  onClick={() => goToQuestion(index)}
                  className={`w-10 h-10 rounded-lg font-medium text-sm transition-colors ${
                    index === currentIndex
                      ? 'bg-primary text-white'
                      : completedQuestions.has(index)
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            {!task.allowSkip && (
              <p className="text-sm text-muted-foreground mt-2">
                <span className="text-orange-500">*</span> 必须按顺序作答所有题目
              </p>
            )}
          </CardContent>
        </Card>

        {/* 当前题目 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            {/* 题目标题 */}
            <div className="flex items-start gap-3 mb-6">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                {currentIndex + 1}
              </span>
              <div className="text-lg leading-relaxed">
                {typeof currentQuestion?.content === 'string' ? (
                  <div dangerouslySetInnerHTML={{ __html: currentQuestion.content }} />
                ) : (
                  <p>{getContentText(currentQuestion?.content)}</p>
                )}
              </div>
            </div>

            {/* 题目类型 */}
            <div className="text-sm text-muted-foreground mb-4">
              题型：{currentQuestion?.type === 'SINGLE_CHOICE' ? '单选题' : 
                    currentQuestion?.type === 'MULTIPLE_CHOICE' ? '多选题' :
                    currentQuestion?.type === 'TRUE_FALSE' ? '判断题' :
                    currentQuestion?.type === 'FILL_BLANK' ? '填空题' :
                    currentQuestion?.type === 'SHORT_ANSWER' ? '简答题' : '解答题'}
            </div>

            {/* 答案区域 - 简化的作答界面 */}
            <div className="space-y-4">
              {/* 选择题选项 */}
              {(currentQuestion?.type === 'SINGLE_CHOICE' || currentQuestion?.type === 'TRUE_FALSE') && (
                <div className="space-y-2">
                  {(() => {
                    // 从 metadata 获取选项，如果没有则使用默认 A/B/C/D
                    const options = currentQuestion.metadata?.options || [
                      { label: 'A', content: '选项内容' },
                      { label: 'B', content: '选项内容' },
                      { label: 'C', content: '选项内容' },
                      { label: 'D', content: '选项内容' },
                    ];
                    return options.map((option) => (
                      <button
                        key={option.label}
                        onClick={() => handleAnswer(currentQuestion.id, option.label)}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                          answers[currentQuestion.id] === option.label
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="font-medium mr-3">{option.label}.</span>
                        <span dangerouslySetInnerHTML={{ __html: option.content }} />
                      </button>
                    ));
                  })()}
                </div>
              )}

              {/* 填空题/简答题 */}
              {(currentQuestion?.type === 'FILL_BLANK' || currentQuestion?.type === 'SHORT_ANSWER' || currentQuestion?.type === 'CALCULATION') && (
                <textarea
                  className="w-full p-4 rounded-lg border-2 border-gray-200 focus:border-primary focus:outline-none min-h-[120px] resize-none"
                  placeholder="请输入你的答案..."
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                />
              )}

              {/* 标记当前题完成 */}
              {answers[currentQuestion.id] && !completedQuestions.has(currentIndex) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setCompletedQuestions(prev => new Set([...prev, currentIndex]));
                    // 自动跳到下一题（如果不是最后一题）
                    if (currentIndex < task.questions.length - 1) {
                      setCurrentIndex(currentIndex + 1);
                    }
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  标记为已完成
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 底部导航 */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            上一题
          </Button>

          {currentIndex < task.questions.length - 1 ? (
            <Button
              onClick={() => setCurrentIndex(currentIndex + 1)}
              disabled={!task.allowSkip && !answers[currentQuestion.id]}
            >
              下一题
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting || (!task.allowSkip && completedQuestions.size < task.questionCount)}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  提交答案
                </>
              )}
            </Button>
          )}
        </div>

        {/* 未完成提示 */}
        {!task.allowSkip && completedQuestions.size < task.questionCount && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            还剩 {task.questionCount - completedQuestions.size} 道题目未作答
          </p>
        )}
      </main>
    </div>
  );
}
