import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * 获取变式题列表
 * GET /api/ai/similar/list?childId=xxx&subjectId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");
    const subjectId = searchParams.get("subjectId");

    if (!childId) {
      return NextResponse.json({ success: false, error: "缺少 childId 参数" }, { status: 400 });
    }

    // 验证孩子账户属于当前用户
    const child = await prisma.childAccount.findFirst({
      where: {
        id: childId,
        userId: session.user.id,
      },
    });

    if (!child) {
      return NextResponse.json({ success: false, error: "孩子账户不存在" }, { status: 404 });
    }

    // 构建查询条件
    const where: any = {
      childId,
    };

    // 如果指定了原题所属学科，筛选
    if (subjectId) {
      where.originalQuestion = {
        subjectId,
      };
    }

    // 查询变式题列表
    const questions = await prisma.similarQuestion.findMany({
      where,
      include: {
        originalQuestion: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 获取统计数据
    const stats = {
      total: questions.length,
      completed: questions.filter((q) => q.status === "COMPLETED").length,
      pending: questions.filter((q) => q.status === "PENDING" || q.status === "GENERATING").length,
      failed: questions.filter((q) => q.status === "FAILED").length,
    };

    // 获取可用的学科列表（从原题中提取）
    const originalQuestionIds = questions.map((q) => q.originalQuestionId);
    const originalQuestions = await prisma.question.findMany({
      where: {
        id: { in: originalQuestionIds },
      },
      select: {
        id: true,
        subjectId: true,
        subject: true,
      },
    });

    const subjectsMap = new Map();
    originalQuestions.forEach((q) => {
      if (q.subject && !subjectsMap.has(q.subjectId)) {
        subjectsMap.set(q.subjectId, q.subject);
      }
    });

    return NextResponse.json({
      success: true,
      questions,
      subjects: Array.from(subjectsMap.values()),
      stats,
    });
  } catch (error) {
    console.error("获取变式题列表失败:", error);
    return NextResponse.json({ success: false, error: "服务器错误" }, { status: 500 });
  }
}
