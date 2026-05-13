import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 获取孩子的错题和已掌握题列表
 * GET /api/dashboard/wrong-questions?childId=xxx&type=wrong|mastered|all&subjectId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");
    const type = searchParams.get("type") || "all"; // wrong, mastered, all
    const subjectId = searchParams.get("subjectId");
    const search = searchParams.get("search") || "";

    if (!childId) {
      return NextResponse.json({ error: "请指定孩子账户" }, { status: 400 });
    }

    // 验证孩子属于当前家长
    const child = await prisma.childAccount.findFirst({
      where: {
        id: childId,
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!child) {
      return NextResponse.json({ error: "孩子账户不存在或无权访问" }, { status: 404 });
    }

    // 构建查询条件
    const whereCondition: any = {
      childId,
    };

    if (type === "wrong") {
      whereCondition.mastered = false;
    } else if (type === "mastered") {
      whereCondition.mastered = true;
    }

    if (subjectId) {
      whereCondition.question = {
        subjectId,
      };
    }

    // 获取错题列表
    const wrongQuestions = await prisma.wrongQuestion.findMany({
      where: whereCondition,
      include: {
        question: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: [
        { mastered: "asc" }, // 未掌握的在前
        { lastAttempt: "desc" }, // 最近复习的在前
      ],
    });

    // 如果有搜索条件，过滤结果
    let filteredQuestions = wrongQuestions;
    if (search) {
      filteredQuestions = wrongQuestions.filter((wq) => {
        const content = typeof wq.question.content === "string"
          ? wq.question.content
          : JSON.stringify(wq.question.content);
        // 去除HTML标签后搜索
        const plainText = content.replace(/<[^>]*>/g, "");
        return plainText.toLowerCase().includes(search.toLowerCase());
      });
    }

    // 获取所有学科列表
    const subjects = await prisma.subject.findMany({
      where: {
        questions: {
          some: {
            wrongQuestions: {
              some: {
                childId,
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
    });

    // 统计信息
    const stats = {
      total: wrongQuestions.length,
      mastered: wrongQuestions.filter((wq) => wq.mastered).length,
      wrong: wrongQuestions.filter((wq) => !wq.mastered).length,
    };

    return NextResponse.json({
      success: true,
      questions: filteredQuestions,
      subjects,
      stats,
      child: {
        id: child.id,
        nickname: child.nickname,
        grade: child.grade,
      },
    });
  } catch (error) {
    console.error("获取错题列表失败:", error);
    return NextResponse.json({ error: "获取数据失败" }, { status: 500 });
  }
}
