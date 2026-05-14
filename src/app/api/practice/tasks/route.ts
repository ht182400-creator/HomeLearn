/**
 * 练习任务 API - 家长推送给孩子的练习任务
 * @description 创建、查询、管理练习任务
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 获取任务列表
 * GET /api/practice/tasks
 * - 家长端: 获取我推送的任务
 * - 可按 status 筛选
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const childId = searchParams.get("childId");

    const where: any = {
      parentId: session.user.id,
    };

    if (status) {
      where.status = status;
    }

    if (childId) {
      where.childId = childId;
    }

    const tasks = await prisma.practiceTask.findMany({
      where,
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("获取任务列表失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

/**
 * 创建新任务（推题）
 * POST /api/practice/tasks
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();
    const {
      childId,
      subjectId,
      title,
      description,
      questionIds,
      dueDate,
      allowSkip = true,
      requireConfirmation = false,
    } = body;

    // 验证必填字段
    if (!childId || !title || !questionIds || questionIds.length === 0) {
      return NextResponse.json(
        { error: "请选择孩子、输入任务名称和至少一道题目" },
        { status: 400 }
      );
    }

    // 验证孩子账户属于当前家长
    const child = await prisma.childAccount.findFirst({
      where: {
        id: childId,
        userId: session.user.id,
      },
    });

    if (!child) {
      return NextResponse.json({ error: "无效的孩子账户" }, { status: 400 });
    }

    // 计算截止日期（默认今天 + 7 天）
    let taskDueDate = dueDate ? new Date(dueDate) : null;
    if (!taskDueDate) {
      taskDueDate = new Date();
      taskDueDate.setDate(taskDueDate.getDate() + 7);
    }

    // 创建任务
    const task = await prisma.practiceTask.create({
      data: {
        parentId: session.user.id,
        childId,
        subjectId: subjectId || null,
        title,
        description: description || null,
        questionIds,
        questionCount: questionIds.length,
        dueDate: taskDueDate,
        allowSkip,
        requireConfirmation,
        status: "PENDING",
      },
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

    // 自动将题目添加到错题本（如果尚未存在）
    for (const questionId of questionIds) {
      const existing = await prisma.wrongQuestion.findFirst({
        where: { childId, questionId, mastered: false },
      });
      if (!existing) {
        await prisma.wrongQuestion.create({
          data: {
            childId,
            questionId,
            wrongAnswer: { source: "TASK_PUSH", pushedAt: new Date() },
            attempts: 0,
            source: "MANUAL",
          },
        });
      }
    }

    // 发送站内通知给孩子
    await prisma.notification.create({
      data: {
        userId: childId,
        userType: "CHILD",
        type: "TASK_ASSIGNED",
        title: "新任务通知",
        content: `"${title}" 已发布，共 ${questionIds.length} 道题目${
          taskDueDate ? `，截止日期：${taskDueDate.toLocaleDateString("zh-CN")}` : ""
        }`,
        taskId: task.id,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("创建任务失败:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
