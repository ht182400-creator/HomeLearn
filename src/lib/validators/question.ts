import { z } from "zod";

// 题目类型枚举
export const QuestionTypeEnum = z.enum([
  "SINGLE_CHOICE",    // 单选题
  "MULTIPLE_CHOICE",  // 多选题
  "TRUE_FALSE",       // 判断题
  "FILL_BLANK",       // 填空题
  "SHORT_ANSWER",     // 简答题
  "CALCULATION",      // 计算题
  "PROOF",            // 证明题
  "COMPREHENSIVE",    // 综合题
  "FREE_RESPONSE",    // 解答题（PDF导入使用）
  "OTHER",            // 其他题型（PDF导入使用）
]);

export type QuestionType = z.infer<typeof QuestionTypeEnum>;

// 难度枚举
export const DifficultyEnum = z.enum([
  "EASY",     // 简单
  "MEDIUM",   // 中等
  "HARD",     // 困难
]);

export type Difficulty = z.infer<typeof DifficultyEnum>;

// 创建题目验证
export const CreateQuestionSchema = z.object({
  // 题目内容（支持 Markdown，含 Base64 图片）
  content: z
    .string()
    .min(1, "题目内容不能为空")
    .max(500000, "题目内容过长，请压缩或减少图片数量"),

  // 题目类型
  type: QuestionTypeEnum,

  // 科目 ID
  subjectId: z.string().min(1, "请选择科目"),

  // 年级 ID（可选）
  gradeId: z.string().optional(),

  // 孩子账户 ID（可选）
  childId: z.string().optional(),

  // 难度 (1-5 数字 或 EASY/MEDIUM/HARD 字符串)
  difficulty: z.union([
    z.coerce.number().min(1).max(5),
    DifficultyEnum
  ]).default(3),

  // 答案（格式根据题目类型不同，含 Base64 图片）
  answer: z
    .string()
    .min(1, "答案不能为空")
    .max(500000, "答案过长，请压缩或减少图片数量"),

  // 解析（可选，含 Base64 图片）
  explanation: z
    .string()
    .max(500000, "解析过长，请压缩或减少图片数量")
    .optional(),

  // 知识点标签（可选，逗号分隔）
  tags: z.string().optional(),
});

// 更新题目验证
export const UpdateQuestionSchema = CreateQuestionSchema.partial().extend({
  id: z.string().min(1, "题目ID不能为空"),
});

// 批量创建题目验证
export const BatchCreateQuestionSchema = z.object({
  questions: z
    .array(CreateQuestionSchema)
    .min(1, "至少需要一道题目")
    .max(100, "单次最多创建100道题目"),
});

// 题目查询验证
export const QueryQuestionsSchema = z.object({
  subjectId: z.string().optional(),
  type: QuestionTypeEnum.optional(),
  difficulty: z.coerce.number().min(1).max(5).optional(),
  grade: z.string().optional(),
  keyword: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

// AI 生成题目验证
export const AIGenerateQuestionSchema = z.object({
  subjectId: z.string().min(1, "请选择科目"),
  type: QuestionTypeEnum.optional(),
  difficulty: DifficultyEnum.optional(),
  count: z.coerce.number().min(1).max(10).default(5),
  topic: z.string().optional(), // 指定知识点
});

// 类型到答案格式映射说明
export const QuestionTypeLabels: Record<QuestionType, string> = {
  SINGLE_CHOICE: "单选题",
  MULTIPLE_CHOICE: "多选题",
  TRUE_FALSE: "判断题",
  FILL_BLANK: "填空题",
  SHORT_ANSWER: "简答题",
  CALCULATION: "计算题",
  PROOF: "证明题",
  COMPREHENSIVE: "综合题",
  FREE_RESPONSE: "解答题",
  OTHER: "其他",
};

// 难度标签
export const DifficultyLabels: Record<Difficulty, string> = {
  EASY: "简单",
  MEDIUM: "中等",
  HARD: "困难",
};

// 答案格式说明
export const AnswerFormatHints: Record<QuestionType, string> = {
  SINGLE_CHOICE: "输入选项字母，如：A",
  MULTIPLE_CHOICE: "输入选项字母，用逗号分隔，如：A,C",
  TRUE_FALSE: "输入：true（正确）或 false（错误）",
  FILL_BLANK: "输入标准答案，支持多个答案用 | 分隔",
  SHORT_ANSWER: "输入参考答案要点",
  CALCULATION: "输入计算过程和最终答案",
  PROOF: "输入证明过程",
  COMPREHENSIVE: "输入完整解答过程",
};

// 导出类型供其他地方使用
export type CreateQuestionInput = z.infer<typeof CreateQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof UpdateQuestionSchema>;
export type QueryQuestionsInput = z.infer<typeof QueryQuestionsSchema>;
export type AIGenerateQuestionInput = z.infer<typeof AIGenerateQuestionSchema>;
