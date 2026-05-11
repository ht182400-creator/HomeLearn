import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { SendMessageSchema, AI_PROMPTS, truncateContext, generateSummary } from "@/lib/validators/chat";

/**
 * 发送消息并获取 AI 回复
 * POST /api/ai/chat
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, content, childId, subject } = SendMessageSchema.parse(body);

    // 验证会话归属
    const chatSession = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        childId,
      },
      include: {
        child: {
          select: {
            parentId: true,
            name: true,
            grade: true,
          },
        },
      },
    });

    if (!chatSession) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    }

    if (chatSession.child.parentId !== session.user.id) {
      return NextResponse.json({ error: "无权访问此会话" }, { status: 403 });
    }

    // 保存用户消息
    const userMessage = await prisma.chatMessage.create({
      data: {
        id: uuidv4(),
        sessionId,
        role: "user",
        content,
      },
    });

    // 获取历史消息用于上下文
    const historyMessages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });

    // 截断上下文
    const contextMessages = truncateContext(historyMessages, 4000);

    // 选择系统提示词
    const systemPrompt = subject ? AI_PROMPTS[subject as keyof typeof AI_PROMPTS] || AI_PROMPTS.general : AI_PROMPTS.general;

    // 构建完整上下文
    const fullContext = [
      { role: "system", content: systemPrompt },
      ...contextMessages.map((m) => ({ role: m.role, content: m.content })),
    ];

    // 调用 AI 接口（这里需要替换为实际的 AI API）
    // 模拟 AI 回复
    const aiResponse = await simulateAIResponse(fullContext, {
      childName: chatSession.child.name,
      grade: chatSession.child.grade,
    });

    // 保存 AI 回复
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        id: uuidv4(),
        sessionId,
        role: "assistant",
        content: aiResponse.content,
      },
    });

    // 更新会话信息
    const updatedMessages = [...historyMessages, { role: "user", content }, { role: "assistant", content: aiResponse.content }];
    const newSummary = generateSummary([...historyMessages, { content }]);

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        messageCount: chatSession.messageCount + 2,
        lastMessageAt: new Date(),
        summary: newSummary,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        userMessage,
        assistantMessage,
        tokens: aiResponse.tokens,
      },
    });
  } catch (error: any) {
    console.error("发送消息失败:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "参数错误", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

/**
 * 获取会话消息历史
 * GET /api/ai/chat?sessionId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "缺少 sessionId 参数" }, { status: 400 });
    }

    // 验证会话归属
    const chatSession = await prisma.chatSession.findFirst({
      where: { id: sessionId },
      include: {
        child: {
          select: { parentId: true },
        },
      },
    });

    if (!chatSession) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    }

    if (chatSession.child.parentId !== session.user.id) {
      return NextResponse.json({ error: "无权访问此会话" }, { status: 403 });
    }

    // 获取消息历史
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    console.error("获取消息历史失败:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

/**
 * 模拟 AI 响应（实际项目中替换为真实 AI API）
 */
async function simulateAIResponse(
  context: Array<{ role: string; content: string }>,
  childInfo: { childName: string; grade: string }
): Promise<{ content: string; tokens: number }> {
  // 获取最后一条用户消息
  const lastUserMessage = context.filter((m) => m.role === "user").pop()?.content || "";

  // 简单的关键词匹配回复
  const keywords = {
    math: ["数学", "计算", "方程", "几何", "加减乘除", "分数", "面积", "周长"],
    english: ["英语", "单词", "语法", "字母", "音标", "作文"],
    chinese: ["语文", "阅读", "写作", "古诗", "汉字"],
  };

  let response = "";
  let subject = "general";

  // 检测学科
  for (const [key, words] of Object.entries(keywords)) {
    if (words.some((w) => lastUserMessage.includes(w))) {
      subject = key;
      break;
    }
  }

  // 生成回复
  const responses: Record<string, string[]> = {
    math: [
      "这个问题很有意思！让我来帮你分析一下。\n\n首先，我们要理解题目的意思。\n\n然后，我们可以这样思考：\n1. 找出已知条件\n2. 确定解题步骤\n3. 逐步计算\n\n你能告诉我你是怎么想的吗？",
      "让我来帮你解答！\n\n这类题目其实有规律的。记住一个口诀：\n**认真读题 → 找出关键 → 分步计算 → 检验结果**\n\n试试用这个方法，你能做出来吗？",
      "好的，这道题我们一起来看。\n\n解题思路：\n1. 先画个图帮助理解\n2. 列出已知信息\n3. 找到数量关系\n4. 列出算式计算\n\n加油，你可以的！",
    ],
    english: [
      "学英语最重要的是多听多说多练！\n\n针对你的问题，我建议：\n1. 先记住这个单词的发音\n2. 再记住它的拼写\n3. 然后了解它的用法\n4. 最后在句子中使用它\n\n要不要我给你出几道练习题？",
      "这个语法点很重要！\n\n记住这个规则：**多用多练，自然就会了**\n\n我建议你可以：\n- 背例句而不是背规则\n- 用这个语法点造句子\n- 读一些相关的短文\n\n有什么不明白的地方随时问我！",
    ],
    chinese: [
      "语文学习需要日积月累。\n\n对于阅读理解，建议：\n1. 先通读全文，了解大意\n2. 再仔细读，划出重点\n3. 根据问题找答案\n4. 联系上下文理解\n\n写作文最重要的是真情实感，多观察生活！",
    ],
    general: [
      "这个问题问得很好！\n\n让我思考一下... 我认为可以从这几个方面来理解：\n1. 先了解基本概念\n2. 找到例子帮助理解\n3. 多练习巩固\n\n还有哪里不明白的吗？",
      "很高兴你愿意主动学习！\n\n对于这个问题，我的建议是：\n- 打好基础\n- 多思考多提问\n- 不懂就问\n\n继续保持这个学习态度，你一定会越来越棒的！💪",
    ],
  };

  const subjectResponses = responses[subject] || responses.general;
  response = subjectResponses[Math.floor(Math.random() * subjectResponses.length)];

  // 添加个性化问候
  response = `你好，${childInfo.childName}！${response}`;

  // 估算 token 数
  const tokens = Math.ceil(response.length / 4);

  return { content: response, tokens };
}
