import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { CreateGoalSchema, UpdateGoalSchema } from "@/lib/validators/goal";

/**
 * 创建学习目标
 * POST /api/goals
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const validated = CreateGoalSchema.parse(body);

    // 验证孩子归属
    const child = await prisma.child.findFirst({
      where: {
        id: validated.childId,
        parentId: session.user.id,
      },
    });

    if (!child) {
      return NextResponse.json({ error: "孩子不存在或无权访问" }, { status: 404 });
    }

    // 创建目标
    const goal = await prisma.learningGoal.create({
      data: {
        id: uuidv4(),
        childId: validated.childId,
        title: validated.title,
        description: validated.description,
        type: validated.type,
        targetValue: validated.targetValue,
        currentValue: validated.currentValue,
        unit: validated.unit,
        startDate: validated.startDate ? new Date(validated.startDate) : new Date(),
        endDate: validated.endDate ? new Date(validated.endDate) : null,
        subjectId: validated.subjectId,
        status: "active",
      },
    });

    return NextResponse.json({
      success: true,
      data: goal,
    });
  } catch (error: any) {
    console.error("创建目标失败:", error);

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
 * 获取孩子的学习目标列表
 * GET /api/goals?childId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");
    const status = searchParams.get("status");

    if (!childId) {
      return NextResponse.json({ error: "缺少 childId 参数" }, { status: 400 });
    }

    // 验证孩子归属
    const child = await prisma.child.findFirst({
      where: {
        id: childId,
        parentId: session.user.id,
      },
    });

    if (!child) {
      return NextResponse.json({ error: "孩子不存在或无权访问" }, { status: 404 });
    }

    // 构建查询条件
    const where: any = { childId };
    if (status) {
      where.status = status;
    }

    // 获取目标列表
    const goals = await prisma.learningGoal.findMany({
      where,
      orderBy: [
        { status: "asc" },
        { createdAt: "desc" },
      ],
      include: {
        subject: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    // 获取进度统计
    const stats = {
      total: goals.length,
      active: goals.filter((g) => g.status === "active").length,
      completed: goals.filter((g) => g.status === "completed").length,
    };

    return NextResponse.json({
      success: true,
      data: {
        goals,
        stats,
      },
    });
  } catch (error: any) {
    console.error("获取目标列表失败:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
