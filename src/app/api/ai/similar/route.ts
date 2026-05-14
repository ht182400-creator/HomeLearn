/**
 * 举一反三 - AI 生成变式题
 * POST /api/ai/similar
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getChildSession } from "@/lib/child-session";  // 孩子端 session
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
{analysis}`;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const { questionId, childId, count = 3, triggerType = "MANUAL" } = body;

    if (!questionId || !childId) {
      return NextResponse.json(
        { error: "缺少必需参数: questionId, childId" },
        { status: 400 }
      );
    }

    // 验证题目归属
    const question = await prisma.question.findFirst({
      where: { id: questionId },
      include: {
        subject: true,
      },
    });

    if (!question) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    // 验证孩子归属
    const child = await prisma.childAccount.findFirst({
      where: {
        id: childId,
        userId: session.user.id,
      },
    });

    if (!child) {
      return NextResponse.json({ error: "孩子不存在或无权访问" }, { status: 403 });
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
        parentId: session.user.id,
        subjectId: question.subjectId,
        triggerType,
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
      // 分析内容：如果有则格式化为"解析：xxx"，否则为空
      const analysisStr = question.analysis 
        ? "解析：" + (typeof question.analysis === 'string' 
          ? question.analysis 
          : JSON.stringify(question.analysis))
        : "";

      const prompt = SIMILAR_QUESTION_PROMPT
        .replace("{count}", String(count))
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
        // 尝试提取 JSON（AI 可能返回带markdown代码块的格式）
        const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/) 
          || aiContent.match(/(\{[\s\S]*\})/);
        const jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
        parsedContent = JSON.parse(jsonStr);
      } catch (parseError) {
        // JSON 解析失败，尝试更宽松的解析
        console.error("JSON解析失败:", parseError, "原始内容:", aiContent);
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

      return NextResponse.json({
        success: true,
        data: {
          id: similarRecord.id,
          status: "COMPLETED",
          questions: parsedContent.questions || [],
          modelUsed: result.adapter,
        },
      });

    } catch (aiError) {
      console.error("AI生成失败:", aiError);
      
      // 更新记录状态为失败
      await prisma.similarQuestion.update({
        where: { id: similarRecord.id },
        data: {
          status: "FAILED",
        },
      });

      return NextResponse.json(
        { error: "AI生成失败，请稍后重试" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("举一反三API错误:", error);
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    );
  }
}

/**
 * 获取变式题列表（只读查询）
 * GET /api/ai/similar?questionId=xxx&childId=xxx
 * 
 * 支持两种认证方式：
 * 1. 家长端 (next-auth)：验证 childId 属于当前登录家长
 * 2. 孩子端 (child_session)：验证 childId 与当前登录孩子匹配
 */
export async function GET(request: NextRequest) {
  try {
    // 尝试双重认证
    const parentSession = await getServerSession(authOptions);   // 家长端
    const childSession = await getChildSession();                 // 孩子端

    if (!parentSession?.user?.id && !childSession) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get("questionId");
    const childId = searchParams.get("childId");

    if (!childId) {
      return NextResponse.json(
        { error: "缺少参数: childId" },
        { status: 400 }
      );
    }

    // 验证归属权限
    // 孩子端：childId 必须与当前登录孩子的 ID 匹配
    // 家长端：childId 必须属于当前登录家长的账户
    let hasPermission = false;
    
    if (childSession && childSession.child.id === childId) {
      hasPermission = true;
    } else if (parentSession?.user?.id) {
      const child = await prisma.childAccount.findFirst({
        where: { id: childId, userId: parentSession.user.id },
      });
      if (child) hasPermission = true;
    }

    if (!hasPermission) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    // 构建查询条件：纯读操作，不调用 AI 生成
    const where: any = { childId };
    if (questionId) {
      where.originalQuestionId = questionId;
    }
    // 只查已完成的变式题
    where.status = "COMPLETED";

    const similarQuestions = await prisma.similarQuestion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        originalQuestion: {
          select: {
            id: true,
            content: true,
            type: true,
            subject: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: similarQuestions,
    });

  } catch (error) {
    console.error("获取变式题列表错误:", error);
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    );
  }
}
