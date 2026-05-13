/**
 * 孩子提交任务 API
 * @description 孩子完成作答后提交，触发任务状态更新
 */
import { NextRequest, NextResponse } from "next/server";
import { getChildSession } from "@/lib/child-session";
import { prisma } from "@/lib/prisma";

/**
 * 孩子提交任务
 * POST /api/practice/tasks/[id]/submit
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getChildSession();
    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = await params;

    const task = await prisma.practiceTask.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }

    // 验证是关联的孩子
    if (task.childId !== session.child.id) {
      return NextResponse.json({ error: "无权限操作此任务" }, { status: 403 });
    }

    // 检查任务状态
    if (task.status === "COMPLETED") {
      return NextResponse.json({ error: "任务已完成" }, { status: 400 });
    }

    if (task.status === "CANCELLED") {
      return NextResponse.json({ error: "任务已取消" }, { status: 400 });
    }

    // 根据是否需要家长确认决定状态
    const newStatus = task.requireConfirmation ? "PENDING_CONFIRM" : "COMPLETED";

    // 读取孩子提交的答案
    const body = await request.json().catch(() => ({}));
    const answers = body.answers || {};

    const updatedTask = await prisma.practiceTask.update({
      where: { id },
      data: {
        status: newStatus,
        completedAt: new Date(),
        answers: answers,
      },
    });

    // 发送通知给家长
    await prisma.notification.create({
      data: {
        userId: task.parentId,
        userType: "USER",
        type: "TASK_SUBMITTED",
        title: "任务已提交",
        content: `孩子 "${task.title}" 已完成${
          task.requireConfirmation ? "，等待您确认" : ""
        }`,
        taskId: task.id,
      },
    });

    return NextResponse.json({
      success: true,
      status: updatedTask.status,
      message: task.requireConfirmation
        ? "已提交，等待家长确认"
        : "已完成",
    });
  } catch (error) {
    console.error("提交任务失败:", error);
    return NextResponse.json({ error: "提交失败" }, { status: 500 });
  }
}
