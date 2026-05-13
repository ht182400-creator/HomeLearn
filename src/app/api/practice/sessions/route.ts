import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { CreatePracticeSessionSchema, QueryPracticeSessionsSchema } from "@/lib/validators/practice";
import { authOptions } from "@/lib/auth";

// GET /api/practice/sessions - 获取练习记录列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      childId: searchParams.get("childId") || undefined,
      subjectId: searchParams.get("subjectId") || undefined,
      status: searchParams.get("status") || undefined,
      page: searchParams.get("page") || "1",
      pageSize: searchParams.get("pageSize") || "20",
    };

    const validatedQuery = QueryPracticeSessionsSchema.parse(queryParams);
    const { page, pageSize, ...filters } = validatedQuery;

    // 构建查询条件
    const where: any = {
      // 关联孩子所属用户必须是当前登录用户
      child: {
        userId: session.user.id,
      },
      ...filters,
    };

    // 查询总数
    const total = await prisma.practiceSession.count({ where });

    // 查询列表
    const sessions = await prisma.practiceSession.findMany({
      where,
      include: {
        child: {
          select: { id: true, nickname: true, avatar: true },
        },
        subject: {
          select: { id: true, name: true, icon: true },
        },
        _count: {
          select: {
            answers: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // 计算每个 session 的正确率
    const sessionsWithStats = await Promise.all(
      sessions.map(async (s) => {
        const correctCount = await prisma.practiceAnswer.count({
          where: {
            sessionId: s.id,
            isCorrect: true,
          },
        });
        const totalAnswered = s._count.answers;
        return {
          ...s,
          correctCount,
          totalAnswered,
          accuracy: totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0,
        };
      })
    );

    return NextResponse.json({
      sessions: sessionsWithStats,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch sessions:", error);
    return NextResponse.json({ error: "获取练习记录失败" }, { status: 500 });
  }
}

// POST /api/practice/sessions - 创建练习会话
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CreatePracticeSessionSchema.parse(body);

    // 验证孩子归属
    const child = await prisma.childAccount.findFirst({
      where: {
        id: validatedData.childId,
        userId: session.user.id,
      },
    });

    if (!child) {
      return NextResponse.json({ error: "孩子不存在或无权限" }, { status: 404 });
    }

    // 获取题目
    let questionWhere: any = {
      subjectId: validatedData.subjectId,
      creatorId: session.user.id,
    };

    if (validatedData.gradeId) {
      questionWhere.gradeId = validatedData.gradeId;
    }

    if (validatedData.difficulty) {
      questionWhere.difficulty = validatedData.difficulty;
    }

    let questions;
    if (validatedData.questionIds && validatedData.questionIds.length > 0) {
      // 指定题目
      questions = await prisma.question.findMany({
        where: {
          id: { in: validatedData.questionIds },
          ...questionWhere,
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // 随机获取
      questions = await prisma.question.findMany({
        where: questionWhere,
        orderBy: { createdAt: "desc" },
        take: validatedData.questionCount,
      });
    }

    if (questions.length === 0) {
      return NextResponse.json({ error: "没有找到符合条件的题目" }, { status: 400 });
    }

    // 创建练习会话
    const practiceSession = await prisma.practiceSession.create({
      data: {
        childId: validatedData.childId,
        subjectId: validatedData.subjectId,
        status: "IN_PROGRESS",
        source: validatedData.source,
        questionCount: questions.length,
      },
    });

    return NextResponse.json({
      message: "练习会话创建成功",
      session: practiceSession,
      questions: questions.map((q) => ({
        id: q.id,
        content: q.content,
        type: q.type,
        difficulty: q.difficulty,
      })),
    }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create session:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "数据验证失败", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "创建练习会话失败" }, { status: 500 });
  }
}
