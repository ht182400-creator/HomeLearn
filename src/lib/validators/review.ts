import { z } from "zod";

/**
 * 艾宾浩斯复习间隔（天）
 * 第1次: 1天, 第2次: 2天, 第3次: 4天, 第4次: 7天, 第5次: 15天, 第6次: 30天
 */
export const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30] as const;

/**
 * 计算下次复习日期
 * @param reviewCount 已复习次数 (从0开始)
 * @returns 下次复习日期
 */
export function calculateNextReviewDate(reviewCount: number): Date {
  const intervalDays = REVIEW_INTERVALS[reviewCount] ?? 30;
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + intervalDays);
  return nextDate;
}

/**
 * 获取记忆遗忘等级
 * @param reviewCount 已复习次数
 * @returns 等级描述
 */
export function getMemoryLevel(reviewCount: number): string {
  if (reviewCount >= 5) return "精通";
  if (reviewCount >= 3) return "熟悉";
  if (reviewCount >= 1) return "学习中";
  return "新学";
}

/**
 * 错题复习验证器
 */
export const reviewAnswerSchema = z.object({
  wrongQuestionId: z.string().min(1, "错题ID不能为空"),
  isCorrect: z.boolean(),
  responseTime: z.number().min(0).optional(),
});

export const getReviewScheduleSchema = z.object({
  childId: z.string().min(1, "孩子ID不能为空"),
  limit: z.number().min(1).max(50).optional().default(20),
});

export const markReviewedSchema = z.object({
  wrongQuestionId: z.string().min(1, "错题ID不能为空"),
  isCorrect: z.boolean(),
  reviewNote: z.string().max(500).optional(),
});

export type ReviewAnswerInput = z.infer<typeof reviewAnswerSchema>;
export type GetReviewScheduleInput = z.infer<typeof getReviewScheduleSchema>;
export type MarkReviewedInput = z.infer<typeof markReviewedSchema>;
