/**
 * 学习目标验证器和工具函数
 * 提供目标创建、进度计算等功能
 */

import { z } from "zod";

// ==================== 验证器 ====================

/**
 * 创建目标验证
 */
export const CreateGoalSchema = z.object({
  childId: z.string().min(1, "孩子ID不能为空"),
  title: z.string().min(1, "目标名称不能为空").max(100, "目标名称不能超过100字符"),
  description: z.string().max(500, "描述不能超过500字符").optional(),
  type: z.enum(["daily", "weekly", "monthly", "custom"]),
  targetValue: z.number().int().positive("目标值必须为正数"),
  currentValue: z.number().int().min(0).default(0),
  unit: z.string().max(20).default("次"),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),
  subjectId: z.string().optional(),
});

export type CreateGoalInput = z.infer<typeof CreateGoalSchema>;

/**
 * 更新目标验证
 */
export const UpdateGoalSchema = CreateGoalSchema.partial().extend({
  id: z.string().min(1, "目标ID不能为空"),
  status: z.enum(["active", "paused", "completed", "cancelled"]).optional(),
});

export type UpdateGoalInput = z.infer<typeof UpdateGoalSchema>;

/**
 * 记录进度验证
 */
export const RecordProgressSchema = z.object({
  goalId: z.string().min(1, "目标ID不能为空"),
  value: z.number().int().positive("进度值必须为正数"),
  note: z.string().max(200).optional(),
});

export type RecordProgressInput = z.infer<typeof RecordProgressSchema>;

// ==================== 工具函数 ====================

/**
 * 计算目标完成百分比
 */
export function calculateProgress(current: number, target: number): number {
  if (target <= 0) return 0;
  const percentage = Math.round((current / target) * 100);
  return Math.min(100, Math.max(0, percentage));
}

/**
 * 获取目标状态
 */
export function getGoalStatus(
  goal: {
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    currentValue: number;
    targetValue: number;
    status: string;
  }
): "not_started" | "in_progress" | "at_risk" | "completed" | "overdue" {
  // 如果已取消或完成
  if (goal.status === "completed" || goal.status === "cancelled") {
    return goal.status === "completed" ? "completed" : "at_risk";
  }

  const now = new Date();
  const start = goal.startDate ? new Date(goal.startDate) : null;
  const end = goal.endDate ? new Date(goal.endDate) : null;

  // 还没开始
  if (start && now < start) {
    return "not_started";
  }

  // 已过期
  if (end && now > end) {
    return goal.currentValue >= goal.targetValue ? "completed" : "overdue";
  }

  // 已完成
  if (goal.currentValue >= goal.targetValue) {
    return "completed";
  }

  // 快要到期
  if (end) {
    const daysUntilEnd = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const totalDays = Math.ceil((end.getTime() - (start?.getTime() || now.getTime())) / (1000 * 60 * 60 * 24));
    const progressPercent = ((totalDays - daysUntilEnd) / totalDays) * 100;
    const currentPercent = calculateProgress(goal.currentValue, goal.targetValue);

    // 进度落后超过20%
    if (currentPercent < progressPercent - 20) {
      return "at_risk";
    }
  }

  return "in_progress";
}

/**
 * 计算连续达成天数
 */
export function calculateStreak(
  records: Array<{ date: Date | string; achieved: boolean }>
): number {
  let streak = 0;
  const sorted = [...records].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const record of sorted) {
    if (record.achieved) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * 格式化剩余时间
 */
export function formatRemainingTime(endDate: Date | string | null): string {
  if (!endDate) return "无截止日期";

  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return "已到期";

  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days === 1) return "明天到期";
  if (days <= 7) return `${days}天后到期`;
  if (days <= 30) return `${Math.ceil(days / 7)}周后到期`;
  return `${Math.ceil(days / 30)}个月后到期`;
}

/**
 * 预设目标模板
 */
export const GOAL_TEMPLATES = [
  {
    type: "daily" as const,
    title: "每日练习",
    description: "每天完成一定数量的练习题",
    icon: "📝",
    color: "blue",
  },
  {
    type: "daily" as const,
    title: "每日复习",
    description: "每天复习一定数量的错题",
    icon: "🔄",
    color: "green",
  },
  {
    type: "weekly" as const,
    title: "周学习时长",
    description: "每周达到一定的学习时间",
    icon: "⏰",
    color: "purple",
  },
  {
    type: "weekly" as const,
    title: "周正确率",
    description: "每周练习正确率达到目标",
    icon: "🎯",
    color: "amber",
  },
  {
    type: "monthly" as const,
    title: "月度掌握",
    description: "每月掌握一定数量的知识点",
    icon: "🏆",
    color: "red",
  },
];

// ==================== 类型定义 ====================

/**
 * 学习目标
 */
export interface Goal {
  id: string;
  childId: string;
  title: string;
  description?: string;
  type: "daily" | "weekly" | "monthly" | "custom";
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate?: Date;
  endDate?: Date;
  subjectId?: string;
  status: "active" | "paused" | "completed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 目标进度记录
 */
export interface GoalRecord {
  id: string;
  goalId: string;
  value: number;
  note?: string;
  createdAt: Date;
}
