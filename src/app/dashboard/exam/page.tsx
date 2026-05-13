'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { examTemplates, difficultyScoreMap, questionTypeNames } from '@/lib/exam-generator/config';
import type { ExamConfig, GeneratedExam, ExamQuestion } from '@/lib/exam-generator/config';

const subjectOptions = [
  { value: 'math', label: '数学' },
  { value: 'chinese', label: '语文' },
  { value: 'english', label: '英语' },
  { value: 'physics', label: '物理' },
  { value: 'chemistry', label: '化学' },
];

const difficultyOptions = [
  { value: 'easy', label: '简单', color: 'bg-green-500' },
  { value: 'medium', label: '中等', color: 'bg-yellow-500' },
  { value: 'hard', label: '困难', color: 'bg-red-500' },
  { value: 'mixed', label: '混合', color: 'bg-purple-500' },
];

const questionTypeOptions = [
  { value: 'choice', label: '选择题' },
  { value: 'fill', label: '填空题' },
  { value: 'solve', label: '解答题' },
];

export default function ExamGeneratorPage() {
  const [loading, setLoading] = useState(false);
  const [currentExam, setCurrentExam] = useState<GeneratedExam | null>(null);
  const [examTitle, setExamTitle] = useState('');
  const [config, setConfig] = useState<ExamConfig>({
    subjects: [],
    questionTypes: ['choice'],
    difficulty: 'mixed',
    questionCount: 10,
    timeLimit: 15,
  });

  // 生成试卷
  const handleGenerateExam = async () => {
    if (config.subjects.length === 0) {
      alert('请至少选择一个科目');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: examTitle || `智能组卷 - ${new Date().toLocaleDateString()}`,
          config,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setCurrentExam(result.data);
      } else {
        alert(result.error || '生成失败');
      }
    } catch (error) {
      console.error('生成试卷失败:', error);
      alert('生成试卷失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 应用模板
  const applyTemplate = (templateId: string) => {
    const template = examTemplates.find(t => t.id === templateId);
    if (template) {
      setConfig(template.config);
      setExamTitle(template.name);
    }
  };

  // 开始答题
  const startExam = (exam: GeneratedExam) => {
    alert(`开始答题：${exam.title}\n题目数：${exam.questions.length}\n时间限制：${exam.timeLimit || '无'}分钟`);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">智能组卷</h1>
        <p className="text-gray-500 mt-2">AI 智能生成个性化练习试卷</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：组卷配置 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 快速模板 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">快速模板</CardTitle>
              <CardDescription>选择预设模板快速开始</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {examTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template.id)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">{template.name}</div>
                  <div className="text-sm text-gray-500">{template.description}</div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* 详细配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">详细配置</CardTitle>
              <CardDescription>自定义组卷参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 科目选择 */}
              <div>
                <label className="block text-sm font-medium mb-2">科目</label>
                <div className="flex flex-wrap gap-2">
                  {subjectOptions.map(subject => (
                    <Badge
                      key={subject.value}
                      variant={config.subjects.includes(subject.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        setConfig(prev => ({
                          ...prev,
                          subjects: prev.subjects.includes(subject.value)
                            ? prev.subjects.filter(s => s !== subject.value)
                            : [...prev.subjects, subject.value],
                        }));
                      }}
                    >
                      {subject.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 题型选择 */}
              <div>
                <label className="block text-sm font-medium mb-2">题型</label>
                <Select
                  value={config.questionTypes[0] || 'choice'}
                  onValueChange={(value: 'choice' | 'fill' | 'solve') => {
                    setConfig(prev => ({ ...prev, questionTypes: [value] as typeof prev.questionTypes }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {questionTypeOptions.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 难度选择 */}
              <div>
                <label className="block text-sm font-medium mb-2">难度</label>
                <Select
                  value={config.difficulty}
                  onValueChange={(value: 'easy' | 'medium' | 'hard' | 'mixed') => {
                    setConfig(prev => ({ ...prev, difficulty: value }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${option.color}`} />
                          {option.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 题目数量 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  题目数量: {config.questionCount}
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={config.questionCount}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    questionCount: parseInt(e.target.value),
                  }))}
                  className="w-full"
                />
              </div>

              {/* 时间限制 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  时间限制: {config.timeLimit || '无'} 分钟
                </label>
                <input
                  type="range"
                  min="0"
                  max="120"
                  step="5"
                  value={config.timeLimit || 0}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    timeLimit: parseInt(e.target.value),
                  }))}
                  className="w-full"
                />
              </div>

              {/* 试卷标题 */}
              <div>
                <label className="block text-sm font-medium mb-2">试卷标题</label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="输入试卷标题"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 生成按钮 */}
              <Button
                onClick={handleGenerateExam}
                disabled={loading || config.subjects.length === 0}
                className="w-full"
              >
                {loading ? '生成中...' : '生成试卷'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：试卷预览 */}
        <div className="lg:col-span-2">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>试卷预览</span>
                {currentExam && (
                  <Button onClick={() => startExam(currentExam)}>
                    开始答题
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                {currentExam ? (
                  <span>
                    {currentExam.questions.length} 道题 · {currentExam.totalScore} 分 · 
                    {currentExam.timeLimit ? `${currentExam.timeLimit}分钟` : '不限时'}
                  </span>
                ) : (
                  '点击"生成试卷"开始组卷'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentExam ? (
                <div className="space-y-6">
                  {/* 试卷标题 */}
                  <div className="text-center border-b pb-4">
                    <h2 className="text-xl font-bold">{currentExam.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      科目: {currentExam.config.subjects.join(', ')} | 
                      难度: {currentExam.config.difficulty === 'mixed' ? '混合' : 
                        currentExam.config.difficulty === 'easy' ? '简单' :
                        currentExam.config.difficulty === 'medium' ? '中等' : '困难'}
                    </p>
                  </div>

                  {/* 题目列表 */}
                  {currentExam.questions.map((question, index) => (
                    <QuestionItem key={question.id} question={question} index={index} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <svg
                    className="w-16 h-16 mx-auto mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p>暂无试卷</p>
                  <p className="text-sm mt-2">请在左侧配置参数并生成试卷</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// 题目组件
function QuestionItem({ question, index }: { question: ExamQuestion; index: number }) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold">第{index + 1}题</span>
          <Badge variant="outline">{questionTypeNames[question.type]}</Badge>
          <Badge
            variant="outline"
            className={
              question.difficulty === 'easy' ? 'text-green-600' :
              question.difficulty === 'medium' ? 'text-yellow-600' : 'text-red-600'
            }
          >
            {question.difficulty === 'easy' ? '简单' :
             question.difficulty === 'medium' ? '中等' : '困难'}
          </Badge>
        </div>
        <span className="text-sm text-gray-500">{question.score}分</span>
      </div>

      <p className="mb-3">{question.content}</p>

      {question.options && (
        <div className="space-y-1 mb-3">
          {question.options.map((option, i) => (
            <div key={i} className="text-sm text-gray-600">{option}</div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAnswer(!showAnswer)}
        >
          {showAnswer ? '隐藏答案' : '查看答案'}
        </Button>
        {showAnswer && (
          <span className="text-green-600 font-medium">答案: {question.answer}</span>
        )}
      </div>
    </div>
  );
}
