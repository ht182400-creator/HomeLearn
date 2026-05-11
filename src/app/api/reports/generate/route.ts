import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReportSchema, getReportPeriod } from "@/lib/validators/report";

/**
 * 生成学习报告
 * POST /api/reports/generate
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();
    const { childId, type } = generateReportSchema.parse(body);

    // 验证孩子账户归属
    const child = await prisma.child.findFirst({
      where: { id: childId, userId: session.user.id },
      include: { grade: true },
    });

    if (!child) {
      return NextResponse.json({ error: "孩子账户不存在" }, { status: 404 });
    }

    // 获取报告周期
    const { start, end } = getReportPeriod(type);

    // 查询练习记录
    const practiceSessions = await prisma.practiceSession.findMany({
      where: {
        childId,
        status: "COMPLETED",
        createdAt: { gte: start, lte: end },
      },
      include: {
        answers: true,
      },
    });

    // 查询复习记录
    const reviewSessions = await prisma.wrongQuestion.findMany({
      where: {
        childId,
        lastReviewDate: { gte: start, lte: end },
      },
    });

    // 计算统计数据
    const totalQuestions = practiceSessions.reduce(
      (sum, s) => sum + s.totalQuestions,
      0
    );
    const correctAnswers = practiceSessions.reduce(
      (sum, s) => sum + s.correctCount,
      0
    );
    const accuracyRate = totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : 0;
    const totalTime = practiceSessions.reduce(
      (sum, s) => sum + (s.totalTime || 0),
      0
    );

    // 统计错题复习情况
    const masteredCount = reviewSessions.filter((r) => r.isMastered).length;
    const reviewCount = reviewSessions.length;

    // 按科目统计
    const subjectStats = await prisma.question.groupBy({
      by: ["subjectId"],
      where: {
        practiceAnswers: {
          some: {
            practiceSession: {
              childId,
              createdAt: { gte: start, lte: end },
            },
          },
        },
      },
      _count: true,
    });

    const subjectDetails = await Promise.all(
      subjectStats.map(async (stat) => {
        const subject = await prisma.subject.findUnique({
          where: { id: stat.subjectId },
        });
        const answers = await prisma.practiceAnswer.findMany({
          where: {
            practiceSession: { childId, createdAt: { gte: start, lte: end } },
            question: { subjectId: stat.subjectId },
          },
        });
        const correct = answers.filter((a) => a.isCorrect).length;
        return {
          subject: subject?.name || "未知",
          total: answers.length,
          correct,
          accuracy: answers.length > 0
            ? Math.round((correct / answers.length) * 100)
            : 0,
        };
      })
    );

    // 生成报告摘要
    const summary = generateSummary(type, {
      totalQuestions,
      accuracyRate,
      totalTime,
      masteredCount,
      reviewCount,
      practiceCount: practiceSessions.length,
    });

    // 创建报告记录
    const report = await prisma.learningReport.create({
      data: {
        childId,
        type,
        periodStart: start,
        periodEnd: end,
        totalQuestions,
        correctQuestions: correctAnswers,
        accuracyRate,
        totalPracticeTime: totalTime,
        summary,
        subjectBreakdown: subjectDetails,
        masteredQuestions: masteredCount,
        reviewedQuestions: reviewCount,
      },
    });

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "参数错误", details: error },
        { status: 400 }
      );
    }
    console.error("生成学习报告失败:", error);
    return NextResponse.json(
      { error: "生成学习报告失败" },
      { status: 500 }
    );
  }
}

/**
 * 生成报告摘要
 */
function generateSummary(
  type: string,
  stats: {
    totalQuestions: number;
    accuracyRate: number;
    totalTime: number;
    masteredCount: number;
    reviewCount: number;
    practiceCount: number;
  }
): string {
  const { accuracyRate, totalQuestions, totalTime, masteredCount, practiceCount } = stats;
  const hours = Math.floor(totalTime / 3600000);
  const minutes = Math.floor((totalTime % 3600000) / 60000);

  let summary = `本${type === "DAILY" ? "日" : type === "WEEKLY" ? "周" : "月"}学习报告：\n`;
  summary += `共完成 ${practiceCount} 次练习，${totalQuestions} 道题目，`;
  summary += `正确率 ${accuracyRate}%，`;
  summary += `累计学习 ${hours > 0 ? `${hours}小时` : ""}${minutes}分钟。\n`;

  if (masteredCount > 0) {
    summary += `本周掌握 ${masteredCount} 道错题，继续保持！`;
  }

  if (accuracyRate >= 90) {
    summary += "\n表现优异！";
  } else if (accuracyRate >= 70) {
    summary += "\n表现良好，还有提升空间。";
  } else {
    summary += "\n需要加强练习，注意错题复习。";
  }

  return summary;
}
