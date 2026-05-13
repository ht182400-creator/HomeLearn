import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 推送复习任务给学生
 * POST /api/review/push
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();
    const { childId, taskType, description, questionIds } = body;

    if (!childId) {
      return NextResponse.json({ error: "请选择孩子账户" }, { status: 400 });
    }

    // 验证孩子账户归属
    const child = await prisma.childAccount.findFirst({
      where: { id: childId, userId: session.user.id },
    });

    if (!child) {
      return NextResponse.json({ error: "孩子账户不存在" }, { status: 404 });
    }

    // 获取待复习的题目数量
    let totalQuestions = 0;
    if (taskType === "REVIEW") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // 获取今日应复习的错题数量
      const reviewCount = await prisma.wrongQuestion.count({
        where: {
          childId,
          mastered: false,
          nextReviewDate: {
            lte: tomorrow,
          },
        },
      });
      totalQuestions = reviewCount;
    }

    // 创建通知发送给孩子的账户（关联到家长账户）
    const notification = await prisma.notification.create({
      data: {
        userId: session.user.id, // 通知发送给家长
        type: "REVIEW_TASK",
        title: "复习任务已推送",
        content: description || `复习任务已推送给 ${child.nickname}，共 ${totalQuestions} 道题目待复习。`,
        data: JSON.stringify({
          childId,
          taskType,
          questionIds: questionIds || [],
          pushedAt: new Date().toISOString(),
        }),
      },
    });

    // 同时创建一个待办任务推送给学生
    // 注意：学生端的通知系统可能需要单独处理，这里先创建通知记录
    await prisma.notification.create({
      data: {
        userId: child.userId, // 通知发送给孩子的登录账户
        type: "REVIEW_TASK",
        title: "收到复习任务",
        content: description || `你收到了一份复习任务，共 ${totalQuestions} 道题目，请尽快完成！`,
        data: JSON.stringify({
          childId,
          taskType,
          questionIds: questionIds || [],
          pushedAt: new Date().toISOString(),
          fromParent: true,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `已成功推送给 ${child.nickname}！`,
      data: {
        notificationId: notification.id,
        totalQuestions,
      },
    });
  } catch (error) {
    console.error("推送复习任务失败:", error);
    return NextResponse.json(
      { error: "推送复习任务失败" },
      { status: 500 }
    );
  }
}
