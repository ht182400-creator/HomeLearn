import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

// GET /api/practice/sessions/[id] - 获取练习会话详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const practiceSession = await prisma.practiceSession.findFirst({
      where: {
        id: params.id,
        child: {
          parentId: session.user.id,
        },
      },
      include: {
        child: {
          select: { id: true, name: true, avatar: true },
        },
        subject: {
          select: { id: true, name: true, icon: true },
        },
        answers: {
          include: {
            question: {
              select: { id: true, content: true, type: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!practiceSession) {
      return NextResponse.json({ error: "练习会话不存在" }, { status: 404 });
    }

    return NextResponse.json({ session: practiceSession });
  } catch (error) {
    console.error("Failed to fetch session:", error);
    return NextResponse.json({ error: "获取练习详情失败" }, { status: 500 });
  }
}

// PATCH /api/practice/sessions/[id] - 更新练习会话状态
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    if (!["IN_PROGRESS", "COMPLETED", "ABANDONED"].includes(status)) {
      return NextResponse.json({ error: "无效的状态" }, { status: 400 });
    }

    // 验证归属
    const existing = await prisma.practiceSession.findFirst({
      where: {
        id: params.id,
        child: {
          parentId: session.user.id,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "练习会话不存在" }, { status: 404 });
    }

    const updated = await prisma.practiceSession.update({
      where: { id: params.id },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : undefined,
      },
    });

    return NextResponse.json({ message: "更新成功", session: updated });
  } catch (error) {
    console.error("Failed to update session:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// DELETE /api/practice/sessions/[id] - 删除练习会话
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    // 验证归属
    const existing = await prisma.practiceSession.findFirst({
      where: {
        id: params.id,
        child: {
          parentId: session.user.id,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "练习会话不存在" }, { status: 404 });
    }

    // 删除会话（级联删除答案）
    await prisma.practiceSession.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("Failed to delete session:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
