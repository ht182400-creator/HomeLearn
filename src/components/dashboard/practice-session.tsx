"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  content: string;
  type: string;
  difficulty: string;
}

interface PracticeSessionProps {
  sessionId: string;
  questions: Question[];
  childId: string;
  childName: string;
  subjectName: string;
}

type AnswerMap = Record<string, string>;

export function PracticeSession({
  sessionId,
  questions,
  childId,
  childName,
  subjectName,
}: PracticeSessionProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [answerHistory, setAnswerHistory] = useState<AnswerMap>({});
  const [showResult, setShowResult] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / totalQuestions) * 100;

  // 记录答案
  const recordAnswer = useCallback((answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));
    setAnswerHistory((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));
  }, [currentQuestion.id]);

  // 选择选项（用于选择题）
  const selectOption = useCallback((option: string) => {
    recordAnswer(option);
  }, [recordAnswer]);

  // 输入框答案（用于填空/简答）
  const handleTextAnswer = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    recordAnswer(e.target.value);
  }, [recordAnswer]);

  // 上一题
  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // 下一题
  const goToNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // 跳转到指定题
  const goToQuestion = (index: number) => {
    setCurrentIndex(index);
  };

  // 提交答案
  const submitAnswers = async () => {
    if (answeredCount === 0) {
      alert("请至少回答一道题目");
      return;
    }

    if (!confirm(`确定要提交吗？您已回答 ${answeredCount}/${totalQuestions} 道题。`)) {
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/practice/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          answers: questions.map((q) => ({
            questionId: q.id,
            answer: answers[q.id] || "",
            timeSpent: 0,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "提交失败");
      }

      setResults(data);
      setShowResult(true);
    } catch (error: any) {
      alert(error.message || "提交失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  // 获取题目状态
  const getQuestionStatus = (index: number) => {
    const q = questions[index];
    if (answers[q.id]) {
      return "answered";
    }
    return "unanswered";
  };

  // 难度颜色
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "EASY":
        return "text-green-600 bg-green-50";
      case "HARD":
        return "text-red-600 bg-red-50";
      default:
        return "text-yellow-600 bg-yellow-50";
    }
  };

  // 题目类型标签
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      SINGLE_CHOICE: "单选",
      MULTIPLE_CHOICE: "多选",
      TRUE_FALSE: "判断",
      FILL_BLANK: "填空",
      SHORT_ANSWER: "简答",
      CALCULATION: "计算",
      PROOF: "证明",
      COMPREHENSIVE: "综合",
    };
    return labels[type] || type;
  };

  // 渲染结果页面
  if (showResult && results) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card className="p-8 text-center">
          <div className="text-6xl mb-4">
            {results.summary.accuracy >= 80 ? "🎉" : results.summary.accuracy >= 60 ? "👍" : "💪"}
          </div>

          <h1 className="text-2xl font-bold mb-2">练习完成！</h1>
          <p className="text-gray-500 mb-6">
            {childName} 的 {subjectName} 练习
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{results.summary.totalAnswered}</div>
              <div className="text-sm text-gray-500">总题数</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{results.summary.correctCount}</div>
              <div className="text-sm text-gray-500">正确</div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="text-3xl font-bold text-red-600">{results.summary.wrongCount}</div>
              <div className="text-sm text-gray-500">错误</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">{results.summary.accuracy}%</div>
              <div className="text-sm text-gray-500">正确率</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => router.push("/dashboard/practice")}>
              返回练习列表
            </Button>
            <Button variant="outline" onClick={() => router.push("/dashboard/review")}>
              查看错题本
            </Button>
          </div>
        </Card>

        {/* 答题详情 */}
        <Card className="p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">答题详情</h2>
          <div className="space-y-3">
            {results.results.map((result: any, index: number) => {
              const question = questions.find((q) => q.id === result.questionId);
              return (
                <div
                  key={result.questionId}
                  className={cn(
                    "p-4 rounded-lg border",
                    result.isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className={cn(
                      "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm",
                      result.isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
                    )}>
                      {result.isCorrect ? "✓" : "✗"}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm text-gray-500 mb-1">第 {index + 1} 题</div>
                      <div className="text-sm mb-2">{question?.content?.substring(0, 50)}...</div>
                      <div className="text-sm">
                        <span className="text-gray-500">你的答案：</span>
                        <span className={result.isCorrect ? "text-green-600" : "text-red-600"}>
                          {result.userAnswer || "(未作答)"}
                        </span>
                      </div>
                      {!result.isCorrect && (
                        <div className="text-sm mt-1">
                          <span className="text-gray-500">正确答案：</span>
                          <span className="text-green-600">{result.correctAnswer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* 顶部进度条 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">{childName}</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">{subjectName}</span>
          </div>
          <span className="text-sm text-gray-500">
            {answeredCount} / {totalQuestions} 已答
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 题目列表 */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h3 className="font-medium mb-3">题目导航</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, index) => (
                <button
                  key={q.id}
                  onClick={() => goToQuestion(index)}
                  className={cn(
                    "w-8 h-8 rounded text-sm font-medium transition-colors",
                    index === currentIndex
                      ? "bg-blue-500 text-white"
                      : getQuestionStatus(index) === "answered"
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span>当前</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-100 border rounded" />
                <span>已答</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-100 border rounded" />
                <span>未答</span>
              </div>
            </div>
          </Card>

          <Button
            className="w-full mt-4"
            onClick={submitAnswers}
            disabled={submitting || answeredCount === 0}
          >
            {submitting ? "提交中..." : `提交答案 (${answeredCount})`}
          </Button>
        </div>

        {/* 题目内容 */}
        <div className="lg:col-span-3">
          <Card className="p-6">
            {/* 题目标题 */}
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                第 {currentIndex + 1} 题
              </span>
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                {getTypeLabel(currentQuestion.type)}
              </span>
              <span className={cn("px-2 py-1 rounded text-xs", getDifficultyColor(currentQuestion.difficulty))}>
                {currentQuestion.difficulty === "EASY" ? "简单" : currentQuestion.difficulty === "HARD" ? "困难" : "中等"}
              </span>
            </div>

            {/* 题目内容 - 使用 dangerouslySetInnerHTML 渲染 HTML */}
            <div 
              className="mb-6 text-lg leading-relaxed prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: typeof currentQuestion.content === 'string' ? currentQuestion.content : String(currentQuestion.content) 
              }} 
            />

            {/* 答案区域 */}
            <div className="space-y-3">
              {(currentQuestion.type === "SINGLE_CHOICE" ||
                currentQuestion.type === "MULTIPLE_CHOICE") && (
                <div className="space-y-2">
                  {["A", "B", "C", "D"].map((option) => (
                    <button
                      key={option}
                      onClick={() => selectOption(option)}
                      className={cn(
                        "w-full p-4 rounded-lg border-2 text-left transition-all",
                        answers[currentQuestion.id] === option
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <span className={cn(
                        "inline-flex items-center justify-center w-8 h-8 rounded-full mr-3 text-sm font-medium",
                        answers[currentQuestion.id] === option
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100"
                      )}>
                        {option}
                      </span>
                      {/* 选项内容 - 这里可以扩展 */}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === "TRUE_FALSE" && (
                <div className="flex gap-4">
                  <button
                    onClick={() => selectOption("true")}
                    className={cn(
                      "flex-1 p-4 rounded-lg border-2 transition-all",
                      answers[currentQuestion.id] === "true"
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <span className="text-2xl mr-2">✓</span> 正确
                  </button>
                  <button
                    onClick={() => selectOption("false")}
                    className={cn(
                      "flex-1 p-4 rounded-lg border-2 transition-all",
                      answers[currentQuestion.id] === "false"
                        ? "border-red-500 bg-red-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <span className="text-2xl mr-2">✗</span> 错误
                  </button>
                </div>
              )}

              {(currentQuestion.type === "FILL_BLANK" ||
                currentQuestion.type === "SHORT_ANSWER" ||
                currentQuestion.type === "CALCULATION" ||
                currentQuestion.type === "PROOF" ||
                currentQuestion.type === "COMPREHENSIVE") && (
                <textarea
                  value={answers[currentQuestion.id] || ""}
                  onChange={handleTextAnswer}
                  placeholder="请输入你的答案..."
                  className="w-full p-4 border rounded-lg resize-y min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            {/* 导航按钮 */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <Button variant="outline" onClick={goToPrev} disabled={currentIndex === 0}>
                上一题
              </Button>
              <span className="text-sm text-gray-500">
                {currentIndex + 1} / {totalQuestions}
              </span>
              {currentIndex < totalQuestions - 1 ? (
                <Button onClick={goToNext}>下一题</Button>
              ) : (
                <Button onClick={submitAnswers} disabled={submitting}>
                  提交答案
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
