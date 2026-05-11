import { z } from "zod";

// 创建练习会话
export const CreatePracticeSessionSchema = z.object({
  childId: z.string().min(1, "请选择孩子"),
  subjectId: z.string().min(1, "请选择科目"),
  gradeId: z.string().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  questionCount: z.coerce.number().min(1).max(50).default(10),
  source: z.enum(["MANUAL", "AI", "WRONG_BOOK", "REVIEW"]).default("MANUAL"),
  questionIds: z.array(z.string()).optional(), // 指定题目ID
});

export type CreatePracticeSessionInput = z.infer<typeof CreatePracticeSessionSchema>;

// 提交答案
export const SubmitAnswerSchema = z.object({
  sessionId: z.string().min(1, "练习ID不能为空"),
  questionId: z.string().min(1, "题目ID不能为空"),
  answer: z.string().min(1, "答案不能为空"),
  timeSpent: z.coerce.number().min(0).default(0), // 花费时间（秒）
});

export type SubmitAnswerInput = z.infer<typeof SubmitAnswerSchema>;

// 批量提交答案
export const BatchSubmitAnswerSchema = z.object({
  sessionId: z.string().min(1, "练习ID不能为空"),
  answers: z.array(
    z.object({
      questionId: z.string().min(1, "题目ID不能为空"),
      answer: z.string().min(1, "答案不能为空"),
      timeSpent: z.coerce.number().min(0).default(0),
    })
  ).min(1, "至少需要提交一个答案"),
});

export type BatchSubmitAnswerInput = z.infer<typeof BatchSubmitAnswerSchema>;

// 查询练习记录
export const QueryPracticeSessionsSchema = z.object({
  childId: z.string().optional(),
  subjectId: z.string().optional(),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "ABANDONED"]).optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

export type QueryPracticeSessionsInput = z.infer<typeof QueryPracticeSessionsSchema>;

// 练习结果统计
export const PracticeResultSchema = z.object({
  totalQuestions: z.number(),
  correctCount: z.number(),
  wrongCount: z.number(),
  accuracy: z.number(), // 正确率 0-100
  totalTimeSpent: z.number(), // 总用时（秒）
  averageTimePerQuestion: z.number(), // 平均每题用时
  weakPoints: z.array(z.object({
    subject: z.string(),
    topic: z.string(),
    count: z.number(),
  })).optional(),
});

export type PracticeResult = z.infer<typeof PracticeResultSchema>;

// 练习状态
export const PracticeStatusEnum = z.enum([
  "IN_PROGRESS", // 进行中
  "COMPLETED",   // 已完成
  "ABANDONED",   // 已放弃
]);

export type PracticeStatus = z.infer<typeof PracticeStatusEnum>;
