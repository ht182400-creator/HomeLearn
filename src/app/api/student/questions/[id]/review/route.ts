/**
 * 错题复习提交 API
 * @description 学生复习错题后提交答案，更新掌握程度
 */
import { NextRequest, NextResponse } from "next/server";
import { getChildSession } from "@/lib/child-session";
import { prisma } from "@/lib/prisma";

/**
 * 提交复习结果
 * POST /api/student/questions/[id]/review
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getChildSession();
    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { isCorrect, answer } = body;

    // 查询错题记录
    const wrongQuestion = await prisma.wrongQuestion.findFirst({
      where: {
        id,
        childId: session.child.id,
      },
    });

    if (!wrongQuestion) {
      return NextResponse.json({ error: "错题记录不存在" }, { status: 404 });
    }

    // 更新掌握程度
    let newMasteryLevel = wrongQuestion.masteryLevel;
    let mastered = wrongQuestion.mastered;

    if (isCorrect) {
      // 答对：掌握程度 +1
      newMasteryLevel = Math.min(wrongQuestion.masteryLevel + 1, 5);
      if (newMasteryLevel >= 4) {
        mastered = true;
      }
    } else {
      // 答错：掌握程度重置为 1
      newMasteryLevel = 1;
      mastered = false;
    }

    // 更新记录
    const updated = await prisma.wrongQuestion.update({
      where: { id },
      data: {
        masteryLevel: newMasteryLevel,
        mastered,
        attempts: { increment: 1 },
        lastAttempt: new Date(),
        lastReview: new Date(),
        wrongAnswer: answer ? { answer } : wrongQuestion.wrongAnswer,
      },
    });

    return NextResponse.json({
      success: true,
      masteryLevel: updated.masteryLevel,
      mastered: updated.mastered,
      attempts: updated.attempts,
      message: isCorrect
        ? "回答正确！掌握程度已提升"
        : "回答错误，请继续复习",
    });
  } catch (error) {
    console.error("提交复习结果失败:", error);
    return NextResponse.json({ error: "提交失败" }, { status: 500 });
  }
}
