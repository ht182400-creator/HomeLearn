/**
 * 单个任务操作 API
 * @description 获取任务详情、删除任务
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getChildSession } from "@/lib/child-session";
import { prisma } from "@/lib/prisma";

/**
 * 获取任务详情
 * GET /api/practice/tasks/[id]
 * 支持家长端(next-auth)和孩子端(child_session)两种认证
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 尝试孩子端认证
    const childSession = await getChildSession();
    // 尝试家长端认证
    const parentSession = await getServerSession(authOptions);

    const { id } = await params;

    const task = await prisma.practiceTask.findUnique({
      where: { id },
      include: {
        child: {
          select: {
            id: true,
            nickname: true,
            grade: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }

    // 验证权限（家长或关联孩子）
    let hasPermission = false;
    if (childSession && task.childId === childSession.child.id) {
      hasPermission = true;
    } else if (parentSession?.user?.id && task.parentId === parentSession.user.id) {
      hasPermission = true;
    }

    if (!hasPermission) {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }

    // 获取题目详情
    const questions = await prisma.question.findMany({
      where: { id: { in: task.questionIds } },
      select: {
        id: true,
        type: true,
        content: true,
        difficulty: true,
        answer: true,
        metadata: true,
      },
    });

    // 获取孩子的答案（如果已提交）
    // 注意：Prisma Json 字段可能返回 null，需要处理
    const userAnswers = task.answers 
      ? JSON.parse(JSON.stringify(task.answers)) as Record<string, any>
      : {};

    // 构建响应数据，显式设置 answers 字段
    const responseData = {
      id: task.id,
      title: task.title,
      description: task.description,
      questionCount: task.questionCount,
      status: task.status,
      allowSkip: task.allowSkip,
      requireConfirmation: task.requireConfirmation,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      parentId: task.parentId,
      childId: task.childId,
      subjectId: task.subjectId,
      questionIds: task.questionIds,
      answers: userAnswers,
      questions,
      child: task.child,
      subject: task.subject,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("获取任务详情失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

/**
 * 删除任务
 * DELETE /api/practice/tasks/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = await params;

    const task = await prisma.practiceTask.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }

    // 只有创建任务的家长可以删除
    if (task.parentId !== session.user.id) {
      return NextResponse.json({ error: "无权限删除" }, { status: 403 });
    }

    // 不能删除已完成的任务
    if (task.status === "COMPLETED") {
      return NextResponse.json(
        { error: "已完成的任务无法删除" },
        { status: 400 }
      );
    }

    await prisma.practiceTask.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除任务失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
