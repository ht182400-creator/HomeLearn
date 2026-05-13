'use client';

/**
 * 错题复习页面
 * @description 学生复习单道错题，支持作答和查看解析
 */
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Brain,
  CheckCircle,
  XCircle,
  Loader2,
  BookOpen,
  Lightbulb,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

interface Question {
  id: string;
  type: string;
  content: any;
  answer: any;
  analysis: any;
  options?: any[];
  subject: { id: string; name: string; color: string };
}

interface WrongQuestion {
  id: string;
  masteryLevel: number;
  attempts: number;
  wrongAnswer: any;
  question: Question;
}

function ReviewContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const questionId = searchParams.get('q');

  const [wrongQuestion, setWrongQuestion] = useState<WrongQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // 加载错题数据
  useEffect(() => {
    if (questionId) {
      fetchWrongQuestion(questionId);
    } else {
      fetchNextReview();
    }
  }, [questionId]);

  const fetchWrongQuestion = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/student/questions/${id}`);
      const data = await res.json();

      if (res.ok) {
        setWrongQuestion(data);
      } else {
        showToast(data.error || '获取题目失败', 'error');
      }
    } catch (error) {
      console.error('获取错题失败:', error);
      showToast('获取题目失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchNextReview = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/student/questions?type=wrong&limit=1');
      const data = await res.json();

      if (res.ok && data.questions && data.questions.length > 0) {
        setWrongQuestion(data.questions[0]);
      } else {
        showToast('暂时没有需要复习的题目', 'info');
      }
    } catch (error) {
      console.error('获取复习题目失败:', error);
      showToast('获取题目失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 获取题目内容
  const getContentHtml = (content: any) => {
    if (!content) return '<p>题目内容加载中...</p>';
    if (typeof content === 'string') {
      return content;
    }
    if (content?.blocks) {
      return content.blocks
        .map((b: any) => `<p>${b.content || ''}</p>`)
        .join('');
    }
    return '<p>题目内容</p>';
  };

  // 获取选项
  const getOptions = (question: Question) => {
    if (question.options && question.options.length > 0) {
      return question.options;
    }
    // 从 content 中解析选项
    if (question.content?.options) {
      return question.content.options;
    }
    return [];
  };

  // 提交答案
  const handleSubmit = async () => {
    if (!userAnswer.trim()) {
      showToast('请先选择或填写答案', 'warning');
      return;
    }

    if (!wrongQuestion) return;

    try {
      setSubmitting(true);

      const correctAnswer = wrongQuestion.question.answer;
      // 提取纯文本用于比较（处理HTML格式答案）
      const extractText = (html: string): string => {
        if (!html) return '';
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || html;
      };
      const correctText = extractText(String(correctAnswer)).trim().toUpperCase();
      const userText = String(userAnswer).trim().toUpperCase();
      const answerCorrect = userText === correctText;

      setIsCorrect(answerCorrect);
      setShowResult(true);

      // 更新掌握程度
      const res = await fetch(`/api/student/questions/${wrongQuestion.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isCorrect: answerCorrect,
          answer: userAnswer,
        }),
      });

      if (!res.ok) {
        console.error('更新复习记录失败');
      }
    } catch (error) {
      console.error('提交答案失败:', error);
      showToast('提交失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 下一题
  const handleNext = () => {
    setUserAnswer('');
    setShowResult(false);
    setIsCorrect(false);
    fetchNextReview();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 via-white to-orange-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!wrongQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 via-white to-orange-50">
        <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <Link href="/student">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12 text-center">
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
          <h2 className="text-xl font-bold mb-2">太棒了！</h2>
          <p className="text-muted-foreground mb-6">暂时没有需要复习的错题</p>
          <Link href="/student">
            <Button>
              <BookOpen className="h-4 w-4 mr-2" />
              返回首页
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  const question = wrongQuestion.question;
  const options = getOptions(question);

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/student">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">错题复习</h1>
                  <p className="text-sm text-muted-foreground">
                    掌握程度: {wrongQuestion.masteryLevel}/5 | 错误次数: {wrongQuestion.attempts}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* 学科标签 */}
        <div className="flex items-center gap-2 mb-6">
          <span
            className="text-xs px-3 py-1 rounded-full font-medium"
            style={{ backgroundColor: question.subject.color + '20', color: question.subject.color }}
          >
            {question.subject.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {question.type === 'SINGLE_CHOICE' ? '单选题' :
             question.type === 'MULTIPLE_CHOICE' ? '多选题' :
             question.type === 'FILL_BLANK' ? '填空题' : '其他'}
          </span>
        </div>

        {/* 题目内容 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: getContentHtml(question.content) }}
            />
          </CardContent>
        </Card>

        {/* 选项区域 */}
        {!showResult && options.length > 0 && (
          <div className="space-y-3 mb-6">
            {options.map((opt: any, index: number) => (
              <button
                key={index}
                onClick={() => setUserAnswer(opt.value || opt.label || String.fromCharCode(65 + index))}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  userAnswer === (opt.value || opt.label || String.fromCharCode(65 + index))
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{opt.content || opt.text || opt}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 填空题输入 */}
        {!showResult && options.length === 0 && (
          <div className="mb-6">
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="请输入你的答案..."
              className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none"
            />
          </div>
        )}

        {/* 结果展示 */}
        {showResult && (
          <Card className={`mb-6 ${isCorrect ? 'border-green-500' : 'border-red-500'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                {isCorrect ? (
                  <>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div>
                      <h3 className="text-lg font-bold text-green-700">回答正确！</h3>
                      <p className="text-sm text-green-600">继续保持，你已经掌握了这道题目</p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-8 w-8 text-red-500" />
                    <div>
                      <h3 className="text-lg font-bold text-red-700">回答错误</h3>
                      <p className="text-sm text-red-600">再仔细看看解析，理解解题思路</p>
                    </div>
                  </>
                )}
              </div>

              {/* 答案对比 */}
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm font-medium text-red-700 mb-1">你的答案</p>
                  <div 
                    className="text-lg prose max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: userAnswer ? String(userAnswer) : '<p>未作答</p>'
                    }}
                  />
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-700 mb-1">正确答案</p>
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: typeof question.answer === 'string' 
                        ? question.answer 
                        : `<p>${JSON.stringify(question.answer)}</p>`
                    }}
                  />
                </div>
              </div>

              {/* 解析 */}
              {question.analysis && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-5 w-5 text-blue-500" />
                    <p className="text-sm font-medium text-blue-700">题目解析</p>
                  </div>
                  <div 
                    className="text-blue-800 prose max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: typeof question.analysis === 'string'
                        ? question.analysis
                        : question.analysis?.text || '<p>暂无解析</p>'
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-4">
          {!showResult ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting || !userAnswer}
              className="flex-1"
              size="lg"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-5 w-5 mr-2" />
              )}
              提交答案
            </Button>
          ) : (
            <>
              <Button
                onClick={handleNext}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                下一题
              </Button>
              <Link href="/student/wrong" className="flex-1">
                <Button variant="outline" className="w-full" size="lg">
                  <BookOpen className="h-5 w-5 mr-2" />
                  查看全部错题
                </Button>
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-red-50 via-white to-orange-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ReviewContent />
    </Suspense>
  );
}
