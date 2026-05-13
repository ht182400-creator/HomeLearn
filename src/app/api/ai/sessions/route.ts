import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { CreateSessionSchema } from "@/lib/validators/chat";

/**
 * 创建 AI 对话会话
 * POST /api/ai/sessions
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const validated = CreateSessionSchema.parse(body);

    // 验证孩子归属
    const child = await prisma.childAccount.findFirst({
      where: {
        id: validated.childId,
        userId: session.user.id,
      },
    });

    if (!child) {
      return NextResponse.json({ error: "孩子不存在或无权访问" }, { status: 404 });
    }

    // 创建会话
    const chatSession = await prisma.chatSession.create({
      data: {
        id: uuidv4(),
        childId: validated.childId,
        parentId: session.user.id,
        subject: validated.subject,
        summary: "新对话",
        messageCount: 0,
        lastMessageAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: chatSession,
    });
  } catch (error: any) {
    console.error("创建会话失败:", error);

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
 * 获取孩子的所有对话会话
 * GET /api/ai/sessions?childId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");

    if (!childId) {
      return NextResponse.json({ error: "缺少 childId 参数" }, { status: 400 });
    }

    // 验证孩子归属
    const child = await prisma.childAccount.findFirst({
      where: {
        id: childId,
        userId: session.user.id,
      },
    });

    if (!child) {
      return NextResponse.json({ error: "孩子不存在或无权访问" }, { status: 404 });
    }

    // 获取会话列表
    const sessions = await prisma.chatSession.findMany({
      where: { childId },
      orderBy: { lastMessageAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      data: sessions,
    });
  } catch (error: any) {
    console.error("获取会话列表失败:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
