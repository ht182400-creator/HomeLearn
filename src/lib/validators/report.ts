import { z } from "zod";

/**
 * 报告类型枚举
 */
export const REPORT_TYPES = ["DAILY", "WEEKLY", "MONTHLY"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

/**
 * 获取报告类型名称
 */
export function getReportTypeName(type: ReportType): string {
  const typeMap: Record<ReportType, string> = {
    DAILY: "日报",
    WEEKLY: "周报",
    MONTHLY: "月报",
  };
  return typeMap[type] || type;
}

/**
 * 获取报告周期
 */
export function getReportPeriod(type: ReportType): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (type) {
    case "DAILY":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "WEEKLY":
      // 本周一
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      start.setDate(now.getDate() + mondayOffset);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case "MONTHLY":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
}

/**
 * 生成报告验证器
 */
export const generateReportSchema = z.object({
  childId: z.string().min(1, "请选择孩子账户"),
  type: z.enum(REPORT_TYPES, {
    errorMap: () => ({ message: "请选择报告类型" }),
  }),
});

/**
 * 获取报告列表验证器
 */
export const getReportsSchema = z.object({
  childId: z.string().min(1, "请选择孩子账户"),
  type: z.enum(REPORT_TYPES).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(50).optional().default(10),
});

export type GenerateReportInput = z.infer<typeof generateReportSchema>;
export type GetReportsInput = z.infer<typeof getReportsSchema>;
