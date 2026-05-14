import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { BatchSubmitAnswerSchema } from "@/lib/validators/practice";
import { authOptions } from "@/lib/auth";
import { generateSimilarForQuestion } from "@/app/api/ai/similar/auto/route";

// POST /api/practice/submit - 批量提交答案
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = BatchSubmitAnswerSchema.parse(body);

    // 验证练习会话归属
    const practiceSession = await prisma.practiceSession.findFirst({
      where: {
        id: validatedData.sessionId,
        child: {
          userId: session.user.id,
        },
      },
      include: {
        child: true,
        subject: true,
      },
    });

    if (!practiceSession) {
      return NextResponse.json({ error: "练习会话不存在" }, { status: 404 });
    }

    if (practiceSession.status === "COMPLETED") {
      return NextResponse.json({ error: "该练习已提交完成" }, { status: 400 });
    }

    // 获取题目答案
    const questionIds = validatedData.answers.map((a) => a.questionId);
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, answer: true, type: true, content: true },
    });

    const questionMap = new Map(questions.map((q) => [q.id, q]));

    // 批量创建/更新答案记录
    const answerResults = await Promise.all(
      validatedData.answers.map(async (answer) => {
        const question = questionMap.get(answer.questionId);
        if (!question) {
          return { questionId: answer.questionId, error: "题目不存在" };
        }

        // 判题
        const isCorrect = normalizeAndCompare(
          answer.answer,
          typeof question.answer === 'string' ? question.answer : JSON.stringify(question.answer)
        );

        // 创建答案记录
        const practiceAnswer = await prisma.practiceAnswer.create({
          data: {
            sessionId: validatedData.sessionId,
            questionId: answer.questionId,
            answer: answer.answer,
            isCorrect,
            timeSpent: answer.timeSpent,
          },
        });

        // 如果答错，自动加入错题本
        if (!isCorrect) {
          await addToWrongBook(
            practiceSession.childId,
            practiceSession.subjectId || "",
            question.id,
            session.user.id
          );
        }

        return {
          questionId: answer.questionId,
          isCorrect,
          userAnswer: answer.answer,
        };
      })
    );

    // 更新会话状态
    const totalAnswered = answerResults.filter((r) => !r.error).length;
    const correctCount = answerResults.filter((r) => r.isCorrect && !r.error).length;
    const wrongCount = totalAnswered - correctCount;
    const totalTimeSpent = validatedData.answers.reduce((sum, a) => sum + a.timeSpent, 0);

    await prisma.practiceSession.update({
      where: { id: validatedData.sessionId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        correctCount,
        wrongCount,
        accuracy: totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0,
        totalTimeSpent,
      },
    });

    return NextResponse.json({
      message: "答案提交成功",
      results: answerResults,
      summary: {
        totalAnswered,
        correctCount,
        wrongCount,
        accuracy: totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0,
        totalTimeSpent,
        averageTimePerQuestion: totalAnswered > 0 ? Math.round(totalTimeSpent / totalAnswered) : 0,
      },
    });
  } catch (error: any) {
    console.error("Failed to submit answers:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "数据验证失败", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "提交答案失败" }, { status: 500 });
  }
}

// 归一化答案并比较
function normalizeAndCompare(userAnswer: string, correctAnswer: string): boolean {
  // 去除首尾空白
  const normalizedUser = userAnswer.trim();
  const normalizedCorrect = correctAnswer.trim();

  // 完全相等
  if (normalizedUser === normalizedCorrect) {
    return true;
  }

  // 判断题特殊处理
  if (normalizedCorrect.toLowerCase() === "true" || normalizedCorrect.toLowerCase() === "false") {
    const userBool = normalizedUser.toLowerCase();
    return (userBool === "true" || userBool === "正确" || userBool === "对") ===
           (normalizedCorrect.toLowerCase() === "true");
  }

  // 单选题特殊处理（支持大小写）
  if (/^[A-Da-d]$/.test(normalizedUser)) {
    return normalizedUser.toUpperCase() === normalizedCorrect.toUpperCase();
  }

  // 多选题特殊处理（排序后比较）
  if (normalizedCorrect.includes(",")) {
    const userSet = new Set(normalizedUser.split(/[,，;；]/).map((s) => s.trim().toUpperCase()));
    const correctSet = new Set(normalizedCorrect.split(/[,，;；]/).map((s) => s.trim().toUpperCase()));
    if (userSet.size !== correctSet.size) return false;
    for (const item of userSet) {
      if (!correctSet.has(item)) return false;
    }
    return true;
  }

  // 填空题：允许多个答案用 | 分隔
  if (normalizedCorrect.includes("|")) {
    const alternatives = normalizedCorrect.split("|").map((s) => s.trim());
    return alternatives.some((alt) => normalizeAndCompare(normalizedUser, alt));
  }

  // 忽略标点差异
  const normalizedUserText = normalizedUser.replace(/[.,;:!?，。；：！？]/g, "");
  const normalizedCorrectText = normalizedCorrect.replace(/[.,;:!?，。；：！？]/g, "");

  return normalizedUserText === normalizedCorrectText;
}

// 添加到错题本
async function addToWrongBook(
  childId: string,
  subjectId: string,
  questionId: string,
  creatorId: string
) {
  // 检查是否已在错题本中
  const existing = await prisma.wrongQuestion.findFirst({
    where: {
      childId,
      questionId,
      mastered: false,
    },
  });

  if (existing) {
    // 更新错误次数
    await prisma.wrongQuestion.update({
      where: { id: existing.id },
      data: {
        attempts: { increment: 1 },
        lastAttempt: new Date(),
      },
    });
  } else {
    // 创建新记录
    const newWrongQuestion = await prisma.wrongQuestion.create({
      data: {
        childId,
        questionId,
        wrongAnswer: { createdAt: new Date() },
        attempts: 1,
        lastAttempt: new Date(),
        source: "PRACTICE",
      },
    });

    // 自动触发举一反三生成（异步，不阻塞响应）
    if (process.env.AUTO_GENERATE_SIMILAR === "true") {
      generateSimilarForQuestion(questionId, childId, creatorId).catch(console.error);
    }
  }
}
