/**
 * 获取单个错题详情 API
 * @description 学生查看某道错题的详细信息
 */
import { NextRequest, NextResponse } from "next/server";
import { getChildSession } from "@/lib/child-session";
import { prisma } from "@/lib/prisma";

/**
 * 获取单个错题详情
 * GET /api/student/questions/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getChildSession();
    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = await params;

    // 查询错题记录
    const wrongQuestion = await prisma.wrongQuestion.findFirst({
      where: {
        id,
        childId: session.child.id,
      },
      include: {
        question: {
          include: {
            subject: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
    });

    if (!wrongQuestion) {
      return NextResponse.json({ error: "错题记录不存在" }, { status: 404 });
    }

    return NextResponse.json({
      id: wrongQuestion.id,
      masteryLevel: wrongQuestion.masteryLevel,
      attempts: wrongQuestion.attempts,
      wrongAnswer: wrongQuestion.wrongAnswer,
      wrongType: wrongQuestion.wrongType,
      question: {
        id: wrongQuestion.question.id,
        type: wrongQuestion.question.type,
        content: wrongQuestion.question.content,
        answer: wrongQuestion.question.answer,
        analysis: wrongQuestion.question.analysis,
        options: wrongQuestion.question.options,
        subject: wrongQuestion.question.subject,
      },
    });
  } catch (error) {
    console.error("获取错题详情失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
