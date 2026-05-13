import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UpdateGoalSchema } from "@/lib/validators/goal";

/**
 * 更新学习目标
 * PUT /api/goals/[goalId]
 */
export async function PUT(
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
    const validated = UpdateGoalSchema.parse({ ...body, id: goalId });

    // 验证目标归属
    const existingGoal = await prisma.learningGoal.findFirst({
      where: { id: goalId },
      include: { child: true },
    });

    if (!existingGoal) {
      return NextResponse.json({ error: "目标不存在" }, { status: 404 });
    }

    if (existingGoal.child.userId !== session.user.id) {
      return NextResponse.json({ error: "无权访问此目标" }, { status: 403 });
    }

    // 更新目标
    const updateData: any = {};
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.targetValue !== undefined) updateData.targetValue = validated.targetValue;
    if (validated.currentValue !== undefined) updateData.currentValue = validated.currentValue;
    if (validated.unit !== undefined) updateData.unit = validated.unit;
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.startDate !== undefined) updateData.startDate = new Date(validated.startDate);
    if (validated.endDate !== undefined) updateData.endDate = validated.endDate ? new Date(validated.endDate) : null;

    const goal = await prisma.learningGoal.update({
      where: { id: goalId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: goal,
    });
  } catch (error: any) {
    console.error("更新目标失败:", error);

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
 * 删除学习目标
 * DELETE /api/goals/[goalId]
 */
export async function DELETE(
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
    const existingGoal = await prisma.learningGoal.findFirst({
      where: { id: goalId },
      include: { child: true },
    });

    if (!existingGoal) {
      return NextResponse.json({ error: "目标不存在" }, { status: 404 });
    }

    if (existingGoal.child.userId !== session.user.id) {
      return NextResponse.json({ error: "无权访问此目标" }, { status: 403 });
    }

    // 删除目标及其进度记录
    await prisma.goalProgressRecord.deleteMany({
      where: { goalId },
    });

    await prisma.learningGoal.delete({
      where: { id: goalId },
    });

    return NextResponse.json({
      success: true,
      message: "目标已删除",
    });
  } catch (error: any) {
    console.error("删除目标失败:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
