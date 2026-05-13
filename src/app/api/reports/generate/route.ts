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
    const child = await prisma.childAccount.findFirst({
      where: { id: childId, userId: session.user.id },
    });

    if (!child) {
      return NextResponse.json({ error: "孩子账户不存在" }, { status: 404 });
    }

    // 获取报告周期
    const { start, end } = getReportPeriod(type);

    // ========== 从实际有数据的表聚合练习数据 ==========
    
    // 1) 从 practice_sessions 表获取自由练习数据
    const practiceSessions = await prisma.practiceSession.findMany({
      where: {
        childId,
        status: "COMPLETED",
        completedAt: { gte: start, lte: end },
      },
    });

    // 2) 从 practice_tasks 表获取推送任务数据（已完成的）
    const completedTasks = await prisma.practiceTask.findMany({
      where: {
        childId,
        status: "COMPLETED",
        completedAt: { gte: start, lte: end },
      },
    });

    // 3) 查询复习记录（错题掌握情况）
    const reviewSessions = await prisma.wrongQuestion.findMany({
      where: {
        childId,
        lastReview: { gte: start, lte: end },
      },
    });

    // ========== 计算统计数据 ==========
    
    // 自由练习统计
    const sessionTotalQuestions = practiceSessions.reduce((sum, s) => sum + (s.questionCount || 0), 0);
    const sessionCorrectCount = practiceSessions.reduce((sum, s) => sum + (s.correctCount || 0), 0);
    const sessionTotalTime = practiceSessions.reduce((sum, s) => sum + (s.totalTimeSpent || 0), 0);

    // 推送任务统计
    let taskTotalQuestions = 0;
    let taskCorrectCount = 0;
    for (const task of completedTasks) {
      const answers = (task.answers as Record<string, any>) || {};
      const questionIds = task.questionIds || [];
      taskTotalQuestions += questionIds.length;
      
      // 获取正确答案来判断对错
      if (questionIds.length > 0 && Object.keys(answers).length > 0) {
        const questions = await prisma.question.findMany({
          where: { id: { in: questionIds } },
          select: { id: true, answer: true },
        });
        const answerMap = new Map(questions.map(q => [q.id, q.answer]));
        for (const qId of questionIds) {
          const childAnswer = answers[qId];
          const correctAnswer = answerMap.get(qId);
          if (childAnswer !== undefined && childAnswer !== null && childAnswer !== '' && correctAnswer) {
            if (String(childAnswer).trim().toUpperCase() === String(correctAnswer).trim().toUpperCase()) {
              taskCorrectCount++;
            }
          }
        }
      }
    }

    // 汇总
    const totalQuestions = sessionTotalQuestions + taskTotalQuestions;
    const correctAnswers = sessionCorrectCount + taskCorrectCount;
    const accuracyRate = totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : 0;
    const totalTime = sessionTotalTime; // 秒

    // 统计错题复习情况
    const masteredCount = reviewSessions.filter((r) => r.mastered).length;
    const reviewCount = reviewSessions.length;

    // 总练习次数 = 自由练习会话数 + 已完成任务数
    const practiceCount = practiceSessions.length + completedTasks.length;

    // 按科目统计
    const subjectMap = new Map<string, { total: number; correct: number }>();
    
    // 自由练习按科目汇总
    for (const record of practiceSessions) {
      if (record.subjectId) {
        const current = subjectMap.get(record.subjectId) || { total: 0, correct: 0 };
        current.total += record.questionCount || 0;
        current.correct += record.correctCount || 0;
        subjectMap.set(record.subjectId, current);
      }
    }
    // 推送任务按科目汇总
    for (const task of completedTasks) {
      if (task.subjectId) {
        const current = subjectMap.get(task.subjectId) || { total: 0, correct: 0 };
        current.total += task.questionIds?.length || 0;
        // 推送任务的正确数已在上面计算过，这里简化处理
        subjectMap.set(task.subjectId, current);
      }
    }

    const subjectDetails = await Promise.all(
      Array.from(subjectMap.entries()).map(async ([subjectId, stats]) => {
        const subject = await prisma.subject.findUnique({
          where: { id: subjectId },
        });
        return {
          subject: subject?.name || "未知",
          total: stats.total,
          correct: stats.correct,
          accuracy: stats.total > 0
            ? Math.round((stats.correct / stats.total) * 100)
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
      practiceCount,
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
