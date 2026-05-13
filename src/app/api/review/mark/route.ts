import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markReviewedSchema, calculateNextReviewDate, REVIEW_INTERVALS } from "@/lib/validators/review";

/**
 * 标记复习结果
 * POST /api/review/mark
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = markReviewedSchema.parse(body);

    // 获取错题记录
    const wrongQuestion = await prisma.wrongQuestion.findUnique({
      where: { id: validatedData.wrongQuestionId },
      include: {
        child: true,
        question: {
          include: {
            subject: true,
          },
        },
      },
    });

    if (!wrongQuestion) {
      return NextResponse.json({ error: "错题记录不存在" }, { status: 404 });
    }

    // 验证归属
    if (wrongQuestion.child.userId !== session.user.id) {
      return NextResponse.json({ error: "无权操作此记录" }, { status: 403 });
    }

    // 计算新的复习参数
    const newReviewCount = validatedData.isCorrect
      ? wrongQuestion.reviewCount + 1
      : 0; // 答错重置

    // 如果答对，计算下次复习日期；答错则明天继续
    const nextReviewDate = validatedData.isCorrect
      ? calculateNextReviewDate(newReviewCount)
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // 明天

    // 判断是否精通（连续答对6次）
    const isMastered = newReviewCount >= REVIEW_INTERVALS.length;

    // 更新错题记录
    const updated = await prisma.wrongQuestion.update({
      where: { id: validatedData.wrongQuestionId },
      data: {
        reviewCount: newReviewCount,
        lastReview: new Date(),
        nextReview: nextReviewDate,
        mastered: isMastered,
        notes: validatedData.reviewNote || undefined,
      },
      include: {
        question: {
          include: {
            subject: true,
          },
        },
      },
    });

    // 如果答错，更新错误次数
    if (!validatedData.isCorrect) {
      await prisma.wrongQuestion.update({
        where: { id: validatedData.wrongQuestionId },
        data: {
          attempts: { increment: 1 },
        },
      });
    }

    // 获取下次复习间隔
    const nextInterval = validatedData.isCorrect
      ? REVIEW_INTERVALS[newReviewCount] ?? 30
      : 1;

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        isCorrect: validatedData.isCorrect,
        newReviewCount,
        isMastered,
        nextReviewDate,
        nextInterval,
        message: validatedData.isCorrect
          ? newReviewCount >= REVIEW_INTERVALS.length
            ? "恭喜！已完全掌握此题目！"
            : `掌握！${nextInterval}天后继续复习`
          : "没关系，明天再试一次！",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "参数错误", details: error },
        { status: 400 }
      );
    }
    console.error("标记复习结果失败:", error);
    return NextResponse.json(
      { error: "标记复习结果失败" },
      { status: 500 }
    );
  }
}
