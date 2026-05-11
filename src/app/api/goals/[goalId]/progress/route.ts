import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { RecordProgressSchema } from "@/lib/validators/goal";

/**
 * 记录目标进度
 * POST /api/goals/[goalId]/progress
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { goalId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { goalId } = params;
    const body = await request.json();
    const validated = RecordProgressSchema.parse({ ...body, goalId });

    // 验证目标归属
    const goal = await prisma.learningGoal.findFirst({
      where: { id: goalId },
      include: { child: true },
    });

    if (!goal) {
      return NextResponse.json({ error: "目标不存在" }, { status: 404 });
    }

    if (goal.child.parentId !== session.user.id) {
      return NextResponse.json({ error: "无权访问此目标" }, { status: 403 });
    }

    if (goal.status !== "active") {
      return NextResponse.json({ error: "目标不是活跃状态" }, { status: 400 });
    }

    // 记录进度
    const record = await prisma.goalProgressRecord.create({
      data: {
        id: uuidv4(),
        goalId,
        value: validated.value,
        note: validated.note,
        createdAt: new Date(),
      },
    });

    // 更新目标当前值
    const newValue = goal.currentValue + validated.value;
    const newStatus = newValue >= goal.targetValue ? "completed" : "active";

    await prisma.learningGoal.update({
      where: { id: goalId },
      data: {
        currentValue: newValue,
        status: newStatus,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        record,
        newValue,
        completed: newValue >= goal.targetValue,
      },
    });
  } catch (error: any) {
    console.error("记录进度失败:", error);

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
 * 获取目标进度历史
 * GET /api/goals/[goalId]/progress
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { goalId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { goalId } = params;

    // 验证目标归属
    const goal = await prisma.learningGoal.findFirst({
      where: { id: goalId },
      include: { child: true },
    });

    if (!goal) {
      return NextResponse.json({ error: "目标不存在" }, { status: 404 });
    }

    if (goal.child.parentId !== session.user.id) {
      return NextResponse.json({ error: "无权访问此目标" }, { status: 403 });
    }

    // 获取进度记录
    const records = await prisma.goalProgressRecord.findMany({
      where: { goalId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: records,
    });
  } catch (error: any) {
    console.error("获取进度历史失败:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
