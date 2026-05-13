/**
 * 学生题库 API - 获取已掌握和易错题
 * @description 提供给学生查看自己的已掌握题库和易错题库
 */
import { NextRequest, NextResponse } from 'next/server';
import { getChildSession } from '@/lib/child-session';
import prisma from '@/lib/db';

/**
 * 获取学生的题库（已掌握/易错）
 * GET /api/student/questions?type=mastered|wrong&subjectId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getChildSession();
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'wrong'; // wrong 或 mastered
    const subjectId = searchParams.get('subjectId') || undefined;

    // 构建查询条件
    const where: any = {
      childId: session.child.id,
    };

    // 根据类型筛选
    if (type === 'mastered') {
      where.mastered = true;
      where.masteryLevel = { gte: 4 }; // 掌握等级 >= 4
    } else {
      where.mastered = false;
    }

    // 学科筛选
    if (subjectId) {
      where.question = { subjectId };
    }

    // 获取题目列表
    const questions = await prisma.wrongQuestion.findMany({
      where,
      include: {
        question: {
          include: {
            subject: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
      orderBy: [
        { masteryLevel: 'desc' },
        { lastAttempt: 'desc' },
      ],
    });

    // 获取学科列表（用于筛选）
    const subjectIds = [...new Set(questions.map(wq => wq.question.subjectId))];
    const subjects = subjectIds.length > 0
      ? await prisma.subject.findMany({
          where: { id: { in: subjectIds } },
          select: { id: true, name: true, color: true },
        })
      : [];

    return NextResponse.json({
      questions,
      subjects,
      stats: {
        total: questions.length,
        mastered: type === 'mastered' ? questions.length : 
          await prisma.wrongQuestion.count({ where: { childId: session.child.id, mastered: true, masteryLevel: { gte: 4 } } }),
        wrong: type === 'wrong' ? questions.length :
          await prisma.wrongQuestion.count({ where: { childId: session.child.id, mastered: false } }),
      },
    });
  } catch (error) {
    console.error('获取学生题库失败:', error);
    return NextResponse.json({ error: '获取题库失败' }, { status: 500 });
  }
}
