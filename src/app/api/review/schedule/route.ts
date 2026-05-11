import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getReviewScheduleSchema } from "@/lib/validators/review";

/**
 * 获取今日复习计划
 * GET /api/review/schedule
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!childId) {
      return NextResponse.json({ error: "请选择孩子账户" }, { status: 400 });
    }

    // 验证孩子账户归属
    const child = await prisma.child.findFirst({
      where: {
        id: childId,
        userId: session.user.id,
      },
    });

    if (!child) {
      return NextResponse.json({ error: "孩子账户不存在" }, { status: 404 });
    }

    // 获取今日需要复习的错题
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const reviewQuestions = await prisma.wrongQuestion.findMany({
      where: {
        childId,
        nextReviewDate: {
          lte: today,
        },
        isMastered: false,
      },
      include: {
        question: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: [
        { priority: "desc" },
        { nextReviewDate: "asc" },
      ],
      take: limit,
    });

    // 计算统计数据
    const stats = {
      totalToReview: reviewQuestions.length,
      newQuestions: reviewQuestions.filter((q) => q.reviewCount === 0).length,
      learningQuestions: reviewQuestions.filter((q) => q.reviewCount > 0 && q.reviewCount < 3).length,
      familiarQuestions: reviewQuestions.filter((q) => q.reviewCount >= 3 && q.reviewCount < 5).length,
      masteredQuestions: reviewQuestions.filter((q) => q.reviewCount >= 5).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        questions: reviewQuestions.map((q) => ({
          id: q.id,
          questionId: q.questionId,
          content: q.question.content,
          options: q.question.options,
          questionType: q.question.questionType,
          correctAnswer: q.question.correctAnswer,
          subject: q.question.subject.name,
          difficulty: q.question.difficulty,
          reviewCount: q.reviewCount,
          priority: q.priority,
          memoryLevel: getMemoryLevel(q.reviewCount),
        })),
        stats,
      },
    });
  } catch (error) {
    console.error("获取复习计划失败:", error);
    return NextResponse.json(
      { error: "获取复习计划失败" },
      { status: 500 }
    );
  }
}

// 辅助函数
function getMemoryLevel(reviewCount: number): string {
  if (reviewCount >= 5) return "精通";
  if (reviewCount >= 3) return "熟悉";
  if (reviewCount >= 1) return "学习中";
  return "新学";
}
