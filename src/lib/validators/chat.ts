/**
 * AI 对话验证器和工具函数
 * 提供对话消息验证、上下文管理等功能
 */

import { z } from "zod";

// ==================== 验证器 ====================

/**
 * 发送消息验证
 */
export const SendMessageSchema = z.object({
  sessionId: z.string().min(1, "会话ID不能为空"),
  content: z.string().min(1, "消息内容不能为空").max(2000, "消息内容不能超过2000字符"),
  childId: z.string().min(1, "孩子ID不能为空"),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;

/**
 * 创建会话验证
 */
export const CreateSessionSchema = z.object({
  childId: z.string().min(1, "孩子ID不能为空"),
  subject: z.string().optional(),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;

// ==================== 工具函数 ====================

/**
 * 对话上下文截断（保持token数量限制）
 * @param messages 消息列表
 * @param maxTokens 最大token数（默认4000）
 */
export function truncateContext(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number = 4000
): Array<{ role: string; content: string }> {
  // 简单估算：1个token约等于4个字符
  const maxChars = maxTokens * 4;
  let totalChars = 0;
  const truncated: Array<{ role: string; content: string }> = [];

  // 从最新消息开始添加
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const msgChars = msg.content.length + 50; // 加上角色名的估算

    if (totalChars + msgChars <= maxChars) {
      truncated.unshift(msg);
      totalChars += msgChars;
    } else {
      break;
    }
  }

  return truncated;
}

/**
 * 生成对话摘要
 */
export function generateSummary(messages: Array<{ content: string }>): string {
  if (messages.length === 0) return "新对话";

  const firstMsg = messages[0]?.content || "新对话";
  return firstMsg.length > 30 ? firstMsg.substring(0, 30) + "..." : firstMsg;
}

/**
 * AI 角色提示词
 */
export const AI_PROMPTS = {
  math: `你是一位专业的数学老师，善于用通俗易懂的方式解释数学概念。
当学生提问时，你会：
1. 先理解学生的问题
2. 给出清晰的解题思路
3. 提供类似的例题
4. 鼓励学生思考
请保持耐心和鼓励的态度。`,

  general: `你是一位知识渊博的学习助手，可以回答各种学科的问题。
你善于用简单易懂的方式解释复杂的概念。
请保持友好、耐心和鼓励的态度。`,

  homework: `你是一位作业辅导老师，帮助学生理解作业中的难题。
你会：
1. 引导学生思考
2. 给出解题思路
3. 解释相关知识点
4. 提供练习建议
请避免直接给出完整答案，而是引导学生自己思考。`,
};

// ==================== 类型定义 ====================

/**
 * 对话消息
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
}

/**
 * 对话会话
 */
export interface ChatSession {
  id: string;
  childId: string;
  subject?: string;
  summary: string;
  messageCount: number;
  lastMessageAt: Date;
  createdAt: Date;
}

/**
 * AI 响应
 */
export interface AIResponse {
  content: string;
  tokens: number;
}
