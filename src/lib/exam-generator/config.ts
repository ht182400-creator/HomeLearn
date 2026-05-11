/**
 * 智能组卷模块
 * AI 智能生成练习试卷
 */

import { z } from 'zod';

// 组卷配置验证
export const examConfigSchema = z.object({
  subjects: z.array(z.string()).min(1, '请至少选择一个科目'),
  questionTypes: z.array(z.enum(['choice', 'fill', 'solve', 'all'])).min(1, '请至少选择一种题型'),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']),
  questionCount: z.number().min(1).max(100),
  timeLimit: z.number().min(5).max(180).optional(),
  includeIncorrect: z.boolean().optional(),
});

// 试卷生成配置
export interface ExamConfig {
  subjects: string[];
  questionTypes: ('choice' | 'fill' | 'solve' | 'all')[];
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  questionCount: number;
  timeLimit?: number;
  includeIncorrect?: boolean;
}

// 试卷题目
export interface ExamQuestion {
  id: string;
  subject: string;
  type: 'choice' | 'fill' | 'solve';
  content: string;
  options?: string[];
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  score: number;
}

// 生成的试卷
export interface GeneratedExam {
  id: string;
  title: string;
  config: ExamConfig;
  questions: ExamQuestion[];
  totalScore: number;
  timeLimit?: number;
  createdAt: string;
}

// 预设模板
export const examTemplates = [
  {
    id: 'daily-practice',
    name: '每日一练',
    description: '10道选择题，适合日常练习',
    config: {
      subjects: [],
      questionTypes: ['choice'] as const,
      difficulty: 'mixed' as const,
      questionCount: 10,
      timeLimit: 15,
    },
  },
  {
    id: 'weekly-test',
    name: '周末测试',
    description: '综合测试，涵盖本周学习内容',
    config: {
      subjects: [],
      questionTypes: ['choice', 'fill', 'solve'] as const,
      difficulty: 'mixed' as const,
      questionCount: 25,
      timeLimit: 45,
    },
  },
  {
    id: 'chapter-review',
    name: '章节复习',
    description: '针对特定章节的复习测试',
    config: {
      subjects: [],
      questionTypes: ['choice', 'fill'] as const,
      difficulty: 'medium' as const,
      questionCount: 15,
      timeLimit: 30,
    },
  },
  {
    id: 'exam-simulation',
    name: '模拟考试',
    description: '完整模拟考试环境',
    config: {
      subjects: [],
      questionTypes: ['choice', 'fill', 'solve'] as const,
      difficulty: 'mixed' as const,
      questionCount: 30,
      timeLimit: 60,
    },
  },
  {
    id: 'error-review',
    name: '错题回顾',
    description: '针对历史错题的专项练习',
    config: {
      subjects: [],
      questionTypes: ['choice', 'fill', 'solve'] as const,
      difficulty: 'mixed' as const,
      questionCount: 20,
      timeLimit: 40,
      includeIncorrect: true,
    },
  },
];

// 难度对应分数
export const difficultyScoreMap = {
  easy: 5,
  medium: 10,
  hard: 15,
};

// 题型名称映射
export const questionTypeNames = {
  choice: '选择题',
  fill: '填空题',
  solve: '解答题',
  all: '全部题型',
};

// 验证组卷配置
export function validateExamConfig(config: unknown): ExamConfig {
  return examConfigSchema.parse(config);
}

// 生成随机 ID
export function generateExamId(): string {
  return `exam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 计算总分
export function calculateTotalScore(questions: ExamQuestion[]): number {
  return questions.reduce((sum, q) => sum + q.score, 0);
}
