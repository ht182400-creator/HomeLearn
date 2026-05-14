/**
 * 自动生成举一反三 - 错题入库时自动触发
 * POST /api/ai/similar/auto
 * 
 * 此接口设计为内部调用，在错题入库流程中触发
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aiGateway } from "@/lib/ai/gateway";
import OpenAI from "openai";

/**
 * 生成变式题的提示词
 */
const SIMILAR_QUESTION_PROMPT = `你是一个专业的题目设计专家。请根据给定的原题目，生成 {count} 道举一反三的变式题。

要求：
1. 变式题应该与原题考察相同的知识点，但题目表述、条件数字或选项要有变化
2. 难度应该与原题相当或略有提升
3. 答案和解析要完整准确
4. 如果原题有多个小问，变式题应尽量保持相同的结构

请按以下JSON格式返回结果（只返回JSON，不要其他内容）：
{{
  "questions": [
    {{
      "content": "题目内容（富文本格式，支持HTML标签）",
      "answer": "答案",
      "analysis": "解题思路分析"
    }}
  ]
}}

原题目信息：
科目：{subject}
年级：{grade}
题目类型：{questionType}
题目内容：{content}
答案：{answer}
{analysis ? `解析：${analysis}` : ""}`;

/**
 * 为单个题目生成变式题（内部使用）
 */
export async function generateSimilarForQuestion(
  questionId: string,
  childId: string,
  parentId: string
) {
  const question = await prisma.question.findFirst({
    where: { id: questionId },
    include: { subject: true },
  });

  if (!question) {
    return { questionId, error: "题目不存在" };
  }

  const child = await prisma.childAccount.findFirst({
    where: { id: childId },
  });

  if (!child) {
    return { questionId, error: "孩子不存在" };
  }

  // 获取当前使用的 AI 模型信息
  const adapters = aiGateway.getStatus();
  const currentAdapter = adapters.find(a => a.enabled);
  const modelUsed = currentAdapter?.name || "unknown";

  // 创建变式题记录
  const similarRecord = await prisma.similarQuestion.create({
    data: {
      originalQuestionId: questionId,
      childId,
      parentId,
      subjectId: question.subjectId,
      triggerType: "AUTO",
      status: "GENERATING",
      modelUsed,
    },
  });

  try {
    // 构建提示词
    const contentStr = typeof question.content === 'string' 
      ? question.content 
      : JSON.stringify(question.content);
    const answerStr = typeof question.answer === 'string' 
      ? question.answer 
      : JSON.stringify(question.answer);
    const analysisStr = question.analysis 
      ? (typeof question.analysis === 'string' 
        ? question.analysis 
        : JSON.stringify(question.analysis))
      : "";

    const prompt = SIMILAR_QUESTION_PROMPT
      .replace("{count}", "3")
      .replace("{subject}", question.subject.name)
      .replace("{grade}", child.grade || "未知")
      .replace("{questionType}", question.type)
      .replace("{content}", contentStr)
      .replace("{answer}", answerStr)
      .replace("{analysis}", analysisStr);

    // 调用 AI 生成变式题
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "user", content: prompt },
    ];

    const result = await aiGateway.chat(messages);
    const aiContent = result.content;

    // 解析 AI 返回的 JSON
    let parsedContent;
    try {
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/) 
        || aiContent.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
      parsedContent = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("JSON解析失败:", parseError);
      parsedContent = { questions: [] };
    }

    // 更新记录状态
    await prisma.similarQuestion.update({
      where: { id: similarRecord.id },
      data: {
        content: parsedContent,
        status: "COMPLETED",
        promptUsed: prompt,
      },
    });

    return { success: true, id: similarRecord.id, count: parsedContent.questions?.length || 0 };

  } catch (aiError) {
    console.error("AI生成失败:", aiError);
    
    await prisma.similarQuestion.update({
      where: { id: similarRecord.id },
      data: {
        status: "FAILED",
      },
    });

    return { success: false, error: "AI生成失败" };
  }
}

/**
 * 触发自动生成
 * POST /api/ai/similar/auto
 */
export async function POST(request: NextRequest) {
  try {
    // 验证内部调用（可以添加简单的密钥验证）
    const apiSecret = request.headers.get("x-api-secret");
    const expectedSecret = process.env.INTERNAL_API_SECRET || "homelearn-internal";
    
    if (apiSecret !== expectedSecret) {
      return NextResponse.json({ error: "无权限" }, { status: 401 });
    }

    const body = await request.json();
    const { wrongQuestionId } = body;

    if (!wrongQuestionId) {
      return NextResponse.json(
        { error: "缺少参数: wrongQuestionId" },
        { status: 400 }
      );
    }

    // 获取错题信息
    const wrongQuestion = await prisma.wrongQuestion.findFirst({
      where: { id: wrongQuestionId },
      include: {
        question: true,
        child: true,
      },
    });

    if (!wrongQuestion) {
      return NextResponse.json({ error: "错题不存在" }, { status: 404 });
    }

    // 异步生成（不阻塞响应）
    // 注意：在生产环境中，应该使用任务队列（如 BullMQ）来处理异步任务
    generateSimilarForQuestion(
      wrongQuestion.questionId,
      wrongQuestion.childId,
      wrongQuestion.child.userId
    ).catch(console.error);

    return NextResponse.json({
      success: true,
      message: "变式题生成任务已提交",
      data: {
        wrongQuestionId,
        questionId: wrongQuestion.questionId,
        childId: wrongQuestion.childId,
      },
    });

  } catch (error) {
    console.error("自动生成举一反三API错误:", error);
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    );
  }
}
