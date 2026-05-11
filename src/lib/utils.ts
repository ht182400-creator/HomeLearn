import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化日期
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 格式化时间
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 艾宾浩斯间隔复习时间计算
 * 初始间隔: 1天, 3天, 7天, 14天, 30天, 60天...
 */
export function calculateNextReview(
  masteryLevel: number,
  lastReview?: Date
): Date {
  const intervals = [1, 3, 7, 14, 30, 60]; // 天数
  const days = intervals[Math.min(masteryLevel, intervals.length - 1)];
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * 难度标签
 */
export function getDifficultyLabel(difficulty: number): string {
  const labels = ['', '简单', '较易', '中等', '较难', '困难'];
  return labels[difficulty] || '中等';
}

/**
 * 难度颜色
 */
export function getDifficultyColor(difficulty: number): string {
  const colors = ['', 'text-green-600', 'text-lime-600', 'text-yellow-600', 'text-orange-600', 'text-red-600'];
  return colors[difficulty] || 'text-yellow-600';
}

/**
 * 题目类型标签
 */
export const QUESTION_TYPE_LABELS: Record<string, string> = {
  SINGLE_CHOICE: '单选题',
  MULTIPLE_CHOICE: '多选题',
  TRUE_FALSE: '判断题',
  FILL_BLANK: '填空题',
  SHORT_ANSWER: '简答题',
  CALCULATION: '计算题',
  PROOF: '证明题',
  COMPOSITION: '作文',
  READING: '阅读理解',
  LISTENING: '听力题',
};

/**
 * 年级标签
 */
export const GRADE_LABELS: Record<string, string> = {
  PRIMARY_1: '小学一年级',
  PRIMARY_2: '小学二年级',
  PRIMARY_3: '小学三年级',
  PRIMARY_4: '小学四年级',
  PRIMARY_5: '小学五年级',
  PRIMARY_6: '小学六年级',
  MIDDLE_1: '初一',
  MIDDLE_2: '初二',
  MIDDLE_3: '初三',
  HIGH_1: '高一',
  HIGH_2: '高二',
  HIGH_3: '高三',
};

/**
 * 计算正确率
 */
export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}
