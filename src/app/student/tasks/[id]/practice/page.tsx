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
  XCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  childId?: string;  // 关联的孩子ID
}

/**
 * 变式题数据结构
 */
interface SimilarQuestion {
  id: string;
  content: any;
  answer: any;
  analysis: any;
  status: string;
  originalQuestion: {
    id: string;
    content: any;
    subject: { name: string };
  };
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

  // 变式题相关状态
  const [similarQuestions, setSimilarQuestions] = useState<SimilarQuestion[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [showSimilarPanel, setShowSimilarPanel] = useState(false);
  const [selectedSimilarIndex, setSelectedSimilarIndex] = useState<number | null>(null);
  // 变式题作答：key 为 `${sqId}_${qIndex}`，值为答案（字符串或字符串数组）
  const [similarAnswers, setSimilarAnswers] = useState<Record<string, any>>({});
  // 是否显示变式题答案/解析
  const [showSimilarResult, setShowSimilarResult] = useState(false);

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  /**
   * 获取当前题目的变式题
   * @param questionId 当前题目ID
   * @param childId 孩子账户ID
   */
  const fetchSimilarQuestions = async (questionId: string, childId: string) => {
    setLoadingSimilar(true);
    try {
      // 查询该原题下、该孩子的所有已完成变式题
      const res = await fetch(`/api/ai/similar?questionId=${questionId}&childId=${childId}`);
      const data = await res.json();
      if (data.success && data.data) {
        // 只获取已完成且有有效内容的变式题（content.questions 存在且非空）
        const validQuestions = data.data.filter(
          (sq: SimilarQuestion) => sq.status === 'COMPLETED' && sq.content?.questions && sq.content.questions.length > 0
        );
        setSimilarQuestions(validQuestions);
      }
    } catch (error) {
      console.error('获取变式题失败:', error);
    } finally {
      setLoadingSimilar(false);
    }
  };

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

  /**
   * 处理变式题作答
   * @param sqId 变式题记录 ID
   * @param qIndex 题目索引（同一变式题组内的第几题）
   * @param answer 学生答案
   */
  const handleSimilarAnswer = (sqId: string, qIndex: number, answer: any) => {
    const key = `${sqId}_${qIndex}`;
    setSimilarAnswers(prev => ({ ...prev, [key]: answer }));
  };

  const goToQuestion = (index: number) => {
    setCurrentIndex(index);
    // 切换题目时重置变式题选择
    setSelectedSimilarIndex(null);
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
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">点击题号切换题目</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (currentQuestion && task.childId) {
                    // 从任务数据获取 childId
                    fetchSimilarQuestions(currentQuestion.id, task.childId);
                    setShowSimilarPanel(!showSimilarPanel);
                  }
                }}
                disabled={!currentQuestion || loadingSimilar || !task.childId}
                className="gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50"
              >
                {loadingSimilar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                举一反三
                {similarQuestions.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {similarQuestions.length}
                  </Badge>
                )}
              </Button>
            </div>
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
              题型：{
                currentQuestion?.type === 'SINGLE_CHOICE' ? '单选题' :
                currentQuestion?.type === 'MULTIPLE_CHOICE' ? '多选题' :
                currentQuestion?.type === 'TRUE_FALSE' ? '判断题' :
                currentQuestion?.type === 'FILL_BLANK' ? '填空题' :
                currentQuestion?.type === 'SHORT_ANSWER' ? '简答题' :
                currentQuestion?.type === 'CALCULATION' ? '计算题' :
                currentQuestion?.type === 'PROOF' ? '证明题' :
                currentQuestion?.type === 'COMPREHENSIVE' ? '综合题' :
                currentQuestion?.type === 'FREE_RESPONSE' ? '解答题' :
                currentQuestion?.type === 'COMPOSITION' ? '作文' :
                currentQuestion?.type === 'READING' ? '阅读理解' :
                currentQuestion?.type === 'LISTENING' ? '听力题' : '其他题型'
              }
            </div>

            {/* 答案区域 - 简化的作答界面 */}
            <div className="space-y-4">
              {/* 单选题/判断题 - 单选按钮 */}
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

              {/* 多选题 - 多选按钮（带复选框） */}
              {currentQuestion?.type === 'MULTIPLE_CHOICE' && (
                <div className="space-y-3">
                  {/* 提示：多选 */}
                  <p className="text-sm text-amber-600 font-medium flex items-center gap-1">
                    <span>◆</span> 多选题（可选择多个答案）
                  </p>
                  {(() => {
                    const options = currentQuestion.metadata?.options;
                    
                    // 如果没有 metadata.options，不渲染选项按钮，让用户用文本框作答
                    if (!options || options.length === 0) {
                      return (
                        <textarea
                          className="w-full p-4 rounded-lg border-2 border-gray-200 focus:border-primary focus:outline-none min-h-[120px] resize-none"
                          placeholder="请选择答案后输入（如：AB、ABC）..."
                          value={answers[currentQuestion.id] || ''}
                          onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                        />
                      );
                    }

                    // 当前已选中的多选答案
                    const selected = (answers[currentQuestion.id] as string[]) || [];
                    
                    const toggleOption = (label: string) => {
                      let newSelected: string[];
                      if (selected.includes(label)) {
                        newSelected = selected.filter(s => s !== label);
                      } else {
                        newSelected = [...selected, label];
                      }
                      handleAnswer(currentQuestion.id, newSelected.sort());
                    };

                    return options.map((option) => {
                      const isSelected = selected.includes(option.label);
                      return (
                        <button
                          key={option.label}
                          onClick={() => toggleOption(option.label)}
                          className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                            isSelected
                              ? 'border-violet-500 bg-violet-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {/* 复选框 + 标签 + 内容 */}
                          <div className="flex items-start gap-3">
                            {/* 复选框图标 */}
                            <span className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center mt-0.5 ${
                              isSelected 
                                ? 'border-violet-500 bg-violet-500 text-white'
                                : 'border-gray-300'
                            }`}>
                              {isSelected && (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </span>
                            <span className="font-bold mr-1 text-lg">{option.label}</span>
                            <span dangerouslySetInnerHTML={{ __html: option.content }} />
                          </div>
                        </button>
                      );
                    });
                  })()}

                  {/* 显示当前已选 */}
                  {answers[currentQuestion.id] && (
                    <p className="text-sm text-violet-600 font-medium pl-2">
                      已选：{
                        Array.isArray(answers[currentQuestion.id])
                          ? (answers[currentQuestion.id] as string[]).join('、')
                          : answers[currentQuestion.id] as string
                      }
                    </p>
                  )}
                </div>
              )}

              {/* 需要文本输入的题型：填空题、简答题、计算题、证明题、综合题、解答题、作文、阅读理解、听力、其他 */}
              {['FILL_BLANK', 'SHORT_ANSWER', 'CALCULATION', 'PROOF', 'COMPREHENSIVE', 'FREE_RESPONSE', 'COMPOSITION', 'READING', 'LISTENING', 'OTHER'].includes(currentQuestion?.type || '') && (
                <textarea
                  className="w-full p-4 rounded-lg border-2 border-gray-200 focus:border-primary focus:outline-none min-h-[120px] resize-none"
                  placeholder={(() => {
                    switch (currentQuestion?.type) {
                      case 'FILL_BLANK': return '请输入填空答案...';
                      case 'SHORT_ANSWER': return '请简述你的答案...';
                      case 'CALCULATION': return '请写出计算过程和答案...';
                      case 'PROOF': return '请写出证明过程...';
                      case 'COMPREHENSIVE': return '请详细解答...';
                      case 'FREE_RESPONSE': return '请写出解答过程...';
                      case 'COMPOSITION': return '请在此写作文...';
                      case 'READING': return '请回答阅读理解问题...';
                      case 'LISTENING': return '请回答听力问题...';
                      default: return '请输入你的答案...';
                    }
                  })()}
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

        {/* 变式题展示面板 */}
        {showSimilarPanel && (
          <Card className="mt-6 border-violet-200 bg-gradient-to-br from-violet-50/50 to-white">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-600" />
                  <h3 className="font-semibold text-violet-700">举一反三 · 变式题</h3>
                  <span className="text-xs text-violet-500 bg-violet-100 px-2 py-0.5 rounded">
                    原题：第 {currentIndex + 1} 题
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSimilarPanel(false)}
                >
                  收起
                  <ChevronUp className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {loadingSimilar ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
                  <span className="ml-2 text-sm text-muted-foreground">加载变式题...</span>
                </div>
              ) : similarQuestions.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 mx-auto mb-3 text-violet-300" />
                  <p className="text-muted-foreground mb-2">暂无相关变式题</p>
                  <p className="text-xs text-muted-foreground">
                    请家长在「举一反三」页面为这道题生成变式题
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 变式题选择列表 */}
                  <div className="flex flex-wrap gap-2">
                    {similarQuestions.map((sq, index) => (
                      <button
                        key={sq.id}
                        onClick={() => setSelectedSimilarIndex(index)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          selectedSimilarIndex === index
                            ? 'bg-violet-600 text-white'
                            : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                        }`}
                      >
                        变式题 {index + 1}
                      </button>
                    ))}
                  </div>

                  {/* 选中的变式题详情 - 学生作答模式 */}
                  {selectedSimilarIndex !== null && similarQuestions[selectedSimilarIndex] && (
                    (() => {
                      const sq = similarQuestions[selectedSimilarIndex];
                      const questions = sq.content?.questions || [];
                      // 原始题目在任务中的索引位置
                      const originalQuestionId = sq.originalQuestion?.id;
                      const originalTaskIndex = task.questions.findIndex(q => q.id === originalQuestionId);
                      const displayNumber = originalTaskIndex >= 0 ? originalTaskIndex + 1 : null;
                      
                      return (
                        <div className="space-y-4 mt-4">
                          {/* 原始题目来源提示 */}
                          <div className="bg-violet-50 rounded-lg p-3 border border-violet-100">
                            <p className="text-sm text-violet-700">
                              <span className="font-medium">原题来源：</span>
                              {displayNumber ? <>本任务第 {displayNumber} 题</> : '外部题目'}
                            </p>
                          </div>

                          {/* 操作栏：显示答案按钮 */}
                          <div className="flex justify-end">
                            <Button
                              variant={showSimilarResult ? "default" : "outline"}
                              size="sm"
                              onClick={() => setShowSimilarResult(!showSimilarResult)}
                              className={`gap-1.5 text-sm ${showSimilarResult ? "bg-green-600 hover:bg-green-700" : "border-green-300 text-green-700 hover:bg-green-50"}`}
                            >
                              {showSimilarResult ? (
                                <>
                                  <EyeOff className="h-4 w-4" />
                                  隐藏答案
                                </>
                              ) : (
                                <>
                                  <Eye className="h-4 w-4" />
                                  查看答案
                                </>
                              )}
                            </Button>
                          </div>

                          {questions.map((q: any, qIndex: number) => {
                            const answerKey = `${sq.id}_${qIndex}`;
                            // 从内容中尝试提取选项（如果 AI 生成了选项）
                            const options = q.options || [];
                            // 判断是否为选择题：有 options 字段或答案为单字母/字母组合
                            const isChoiceType = options.length > 0 || /^[A-Z]{1,5}$/.test(String(q.answer || '').trim());
                            const currentAnswer = similarAnswers[answerKey] || '';

                            return (
                              <div key={qIndex} className="bg-white rounded-lg border border-violet-100 p-4">
                                <div className="flex items-start gap-3">
                                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-medium">
                                    {qIndex + 1}
                                  </span>
                                  <div className="flex-1 space-y-3">
                                    {/* 变式题题目 */}
                                    <div>
                                      <p className="text-sm text-muted-foreground mb-1">变式题：</p>
                                      <div
                                        className="prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{
                                          __html: typeof q.content === 'string' ? q.content : getContentText(q.content)
                                        }}
                                      />
                                    </div>

                                    {/* 作答区域 */}
                                    {!showSimilarResult && (
                                      <div className="space-y-2 mt-3 pt-3 border-t border-gray-100">
                                        <p className="text-xs text-muted-foreground font-medium">你的答案：</p>
                                        
                                        {/* 有选项的选择题 */}
                                        {isChoiceType && options.length > 0 && (
                                          <div className="space-y-1.5">
                                            {options.map((opt: string, oi: number) => {
                                              const label = String.fromCharCode(65 + oi); // A, B, C, D...
                                              const isSelected = currentAnswer.includes(label);
                                              return (
                                                <button
                                                  key={oi}
                                                  onClick={() => handleSimilarAnswer(sq.id, qIndex, label)}
                                                  className={`w-full p-2.5 rounded-md border text-left transition-colors text-sm ${
                                                    isSelected
                                                      ? 'border-violet-500 bg-violet-50'
                                                      : 'border-gray-200 hover:border-gray-300'
                                                  }`}
                                                >
                                                  <span className="font-bold mr-2">{label}.</span>
                                                  <span dangerouslySetInnerHTML={{ __html: opt }} />
                                                </button>
                                              );
                                            })}
                                          </div>
                                        )}

                                        {/* 无选项时用文本框作答 */}
                                        {(isChoiceType && options.length === 0) || !isChoiceType ? (
                                          <textarea
                                            className="w-full p-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:outline-none min-h-[80px] resize-none text-sm"
                                            placeholder={
                                              isChoiceType ? '请输入选项字母（如：A、AB）...' :
                                              '请输入你的答案...'
                                            }
                                            value={currentAnswer}
                                            onChange={(e) => handleSimilarAnswer(sq.id, qIndex, e.target.value)}
                                          />
                                        ) : null}
                                      </div>
                                    )}

                                    {/* 显示答案和解析（仅查看模式下） */}
                                    {showSimilarResult && (
                                      <>
                                        {/* 答案对比 */}
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                          <div className="bg-green-50 rounded-lg p-3 mb-2">
                                            <p className="text-sm text-green-700 font-medium mb-1">参考答案：</p>
                                            <div
                                              className="text-sm text-green-800"
                                              dangerouslySetInnerHTML={{
                                                __html: typeof q.answer === 'string' ? q.answer : getContentText(q.answer)
                                              }}
                                            />
                                          </div>
                                          {/* 你的答案回顾 */}
                                          {currentAnswer && (
                                            <div className="bg-gray-50 rounded-lg p-3 mb-2">
                                              <p className="text-sm text-gray-500 font-medium mb-1">你的答案：</p>
                                              <p className="text-sm text-gray-800">{String(currentAnswer)}</p>
                                            </div>
                                          )}
                                        </div>

                                        {/* 解析 */}
                                        {q.analysis && (
                                          <div className="bg-blue-50 rounded-lg p-3 mt-2">
                                            <p className="text-sm text-blue-700 font-medium mb-1">解题思路：</p>
                                            <div
                                              className="text-sm text-blue-800"
                                              dangerouslySetInnerHTML={{
                                                __html: typeof q.analysis === 'string' ? q.analysis : getContentText(q.analysis)
                                              }}
                                            />
                                          </div>
                                        )}

                                        {/* 继续作答提示 */}
                                        <p className="text-xs text-center text-muted-foreground mt-3">
                                          点击"隐藏答案"可继续修改答案
                                        </p>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
