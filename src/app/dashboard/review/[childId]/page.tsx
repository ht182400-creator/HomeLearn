"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Trophy,
  Home,
  Brain,
  Clock,
} from "lucide-react";

interface Question {
  id: string;
  questionId: string;
  content: string;
  options: string[];
  questionType: string;
  subject: string;
  difficulty: string;
  reviewCount: number;
  memoryLevel: string;
  correctAnswer: string;
}

interface ReviewResult {
  id: string;
  isCorrect: boolean;
  newReviewCount: number;
  isMastered: boolean;
  nextInterval: number;
  message: string;
}

export default function ReviewSessionPage({
  params,
}: {
  params: { childId: string };
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await fetch(`/api/review/schedule?childId=${params.childId}&limit=20`);
        const data = await res.json();
        if (data.success && data.data.questions.length > 0) {
          setQuestions(data.data.questions);
        } else {
          setFinished(true);
        }
      } catch (error) {
        console.error("加载题目失败:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [params.childId]);

  const currentQuestion = questions[currentIndex];

  const handleSubmit = async () => {
    if (!currentQuestion || !userAnswer.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/review/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wrongQuestionId: currentQuestion.id,
          isCorrect: userAnswer.trim() === currentQuestion.correctAnswer,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        setShowResult(true);
        if (data.data.isCorrect) {
          setStats((prev) => ({ ...prev, correct: prev.correct + 1 }));
        } else {
          setStats((prev) => ({ ...prev, wrong: prev.wrong + 1 }));
        }
      }
    } catch (error) {
      console.error("提交答案失败:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setUserAnswer("");
      setShowResult(false);
      setResult(null);
    } else {
      setFinished(true);
    }
  };

  const getQuestionTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      SINGLE_CHOICE: "单选题",
      MULTIPLE_CHOICE: "多选题",
      TRUE_FALSE: "判断题",
      FILL_BLANK: "填空题",
      SHORT_ANSWER: "简答题",
      CALCULATION: "计算题",
      PROOF: "证明题",
      COMPREHENSIVE: "综合题",
    };
    return typeMap[type] || type;
  };

  const getDifficultyColor = (difficulty: string) => {
    const colorMap: Record<string, string> = {
      EASY: "text-green-600 bg-green-100",
      MEDIUM: "text-yellow-600 bg-yellow-100",
      HARD: "text-red-600 bg-red-100",
    };
    return colorMap[difficulty] || "";
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (finished) {
    const total = stats.correct + stats.wrong;
    const rate = total > 0 ? Math.round((stats.correct / total) * 100) : 0;

    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card className="text-center">
          <CardContent className="pt-12 pb-8">
            <Trophy className="h-20 w-20 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-3xl font-bold mb-2">复习完成！</h2>
            <p className="text-muted-foreground mb-6">
              {total === 0 ? "今日没有需要复习的题目" : `本次复习 ${total} 道题目`}
            </p>
            {total > 0 && (
              <div className="flex justify-center gap-8 mb-8">
                <div className="text-center">
                  <p className="text-4xl font-bold text-green-600">{stats.correct}</p>
                  <p className="text-sm text-muted-foreground">答对</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-red-600">{stats.wrong}</p>
                  <p className="text-sm text-muted-foreground">答错</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary">{rate}%</p>
                  <p className="text-sm text-muted-foreground">正确率</p>
                </div>
              </div>
            )}
            <div className="flex justify-center gap-4">
              <Button onClick={() => router.push("/dashboard/review")} variant="outline">
                <Home className="h-4 w-4 mr-2" />
                返回复习中心
              </Button>
              <Button onClick={() => router.push("/dashboard/practice")}>
                去练习更多题目
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* 顶部进度 */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => router.push("/dashboard/review")} className="gap-2">
          <Home className="h-4 w-4" />
          退出
        </Button>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {questions.length}
          </span>
          <div className="flex gap-1">
            {questions.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index < currentIndex ? "bg-primary" : index === currentIndex ? "bg-primary ring-2 ring-primary ring-offset-2" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Brain className="h-4 w-4 text-primary" />
          <span>{currentQuestion.memoryLevel}</span>
        </div>
      </div>

      {/* 题目卡片 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-primary/10 text-primary text-sm rounded">
                {currentQuestion.subject}
              </span>
              <span className="px-2 py-1 bg-muted text-sm">
                {getQuestionTypeName(currentQuestion.questionType)}
              </span>
              <span className={`px-2 py-1 text-sm rounded ${getDifficultyColor(currentQuestion.difficulty)}`}>
                {currentQuestion.difficulty === "EASY" ? "简单" : currentQuestion.difficulty === "MEDIUM" ? "中等" : "困难"}
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>第 {currentQuestion.reviewCount + 1} 次复习</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 题目内容 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">{currentQuestion.content}</h3>
            {currentQuestion.options && currentQuestion.options.length > 0 && (
              <div className="space-y-2">
                {currentQuestion.options.map((option, index) => (
                  <div
                    key={index}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      userAnswer === option ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => !showResult && setUserAnswer(option)}
                  >
                    <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                    {option}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 填空题 */}
          {currentQuestion.questionType === "FILL_BLANK" && (
            <div className="mb-6">
              <Label>请输入答案</Label>
              <Textarea
                value={userAnswer}
                onChange={(e) => !showResult && setUserAnswer(e.target.value)}
                placeholder="请输入你的答案..."
                disabled={showResult}
                className="mt-2"
              />
            </div>
          )}

          {/* 答案提交 */}
          {!showResult ? (
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!userAnswer.trim() || submitting}>
                {submitting ? "提交中..." : "提交答案"}
              </Button>
            </div>
          ) : (
            <>
              <div className={`p-4 rounded-lg mb-4 ${result?.isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                <div className="flex items-center gap-2 mb-2">
                  {result?.isCorrect ? (
                    <>
                      <Check className="h-5 w-5" />
                      <span className="font-semibold">回答正确！</span>
                    </>
                  ) : (
                    <>
                      <X className="h-5 w-5" />
                      <span className="font-semibold">回答错误</span>
                    </>
                  )}
                </div>
                <p className="text-sm">{result?.message}</p>
                {!result?.isCorrect && (
                  <p className="text-sm mt-1">
                    正确答案: <strong>{currentQuestion.correctAnswer}</strong>
                  </p>
                )}
              </div>
              <div className="flex justify-end">
                <Button onClick={handleNext}>
                  {currentIndex < questions.length - 1 ? (
                    <>下一题 <ChevronRight className="h-4 w-4 ml-2" /></>
                  ) : (
                    <>完成复习 <Trophy className="h-4 w-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
