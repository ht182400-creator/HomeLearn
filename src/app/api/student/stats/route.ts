/**
 * 学生学习统计 API
 * @description 获取学生的学习数据统计
 */
import { NextResponse } from 'next/server';
import { getChildSession } from '@/lib/child-session';
import { prisma } from '@/lib/prisma';

/**
 * 获取学生学习统计
 * GET /api/student/stats
 */
export async function GET() {
  try {
    const session = await getChildSession();
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const childId = session.child.id;

    // 获取练习记录
    const practiceRecords = await prisma.practiceRecord.findMany({
      where: { childId },
    });

    // 获取错题记录
    const wrongQuestions = await prisma.wrongQuestion.findMany({
      where: { childId },
    });

    // 计算统计数据
    const totalPractice = practiceRecords.length;
    const totalQuestions = practiceRecords.reduce(
      (sum, p) => sum + (p.totalQuestions || 0),
      0
    );
    const correctCount = practiceRecords.reduce(
      (sum, p) => sum + (p.correctCount || 0),
      0
    );
    const accuracyRate =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const totalTime = practiceRecords.reduce(
      (sum, p) => sum + (p.duration || 0),
      0
    );
    const wrongCount = wrongQuestions.filter((w) => !w.mastered).length;
    const masteredCount = wrongQuestions.filter((w) => w.mastered).length;

    // 计算待复习数量
    const now = new Date();
    const reviewDue = wrongQuestions.filter(
      (w) => !w.mastered && w.nextReview && new Date(w.nextReview) <= now
    ).length;

    // 学科统计（简化版，不依赖task关系）
    const subjectMap = new Map<string, { total: number; correct: number }>();
    practiceRecords.forEach((record) => {
      const subjectName = '练习';
      const current = subjectMap.get(subjectName) || { total: 0, correct: 0 };
      current.total += record.totalQuestions || 0;
      current.correct += record.correctCount || 0;
      subjectMap.set(subjectName, current);
    });

    const subjectStats = Array.from(subjectMap.entries()).map(
      ([subject, data]) => ({
        subject,
        total: data.total,
        correct: data.correct,
        accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      })
    );

    // 本周数据（最近7天）
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weeklyData: { day: string; questions: number; correct: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayRecords = practiceRecords.filter((r) => {
        const rDate = new Date(r.createdAt);
        return rDate >= date && rDate < nextDate;
      });

      weeklyData.push({
        day: days[date.getDay()],
        questions: dayRecords.reduce(
          (sum, r) => sum + (r.totalQuestions || 0),
          0
        ),
        correct: dayRecords.reduce(
          (sum, r) => sum + (r.correctCount || 0),
          0
        ),
      });
    }

    return NextResponse.json({
      stats: {
        totalPractice,
        totalQuestions,
        correctCount,
        accuracyRate,
        totalTime,
        wrongCount,
        masteredCount,
        reviewDue,
      },
      subjectStats,
      weeklyData,
    });
  } catch (error) {
    console.error('获取学习统计失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
