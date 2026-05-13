/**
 * 家长确认任务完成 API
 * @description 家长确认孩子任务已完成
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 家长确认任务完成
 * POST /api/practice/tasks/[id]/confirm
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = await params;

    const task = await prisma.practiceTask.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }

    // 验证是创建的家长
    if (task.parentId !== session.user.id) {
      return NextResponse.json({ error: "无权限操作此任务" }, { status: 403 });
    }

    // 检查任务状态
    if (task.status !== "PENDING_CONFIRM") {
      return NextResponse.json(
        { error: "该任务无需确认" },
        { status: 400 }
      );
    }

    // 获取题目和答案，用于判断对错并分类
    const questions = await prisma.question.findMany({
      where: { id: { in: task.questionIds } },
      select: { id: true, answer: true, subjectId: true },
    });
    const answers = (task.answers as Record<string, any>) || {};

    console.log('[确认任务] 任务ID:', id);
    console.log('[确认任务] 题目数量:', questions.length);
    console.log('[确认任务] 答案数据:', JSON.stringify(answers));
    console.log('[确认任务] 题目IDs:', task.questionIds);

    // 统计各类题目数量
    let unansweredCount = 0;
    let correctCount = 0;
    let wrongCount = 0;

    // 逐题判断对错，分类到已掌握/易错题库
    for (const question of questions) {
      const childAnswer = answers[question.id];
      const correctAnswer = question.answer;
      const hasAnswer = childAnswer !== undefined && childAnswer !== null && childAnswer !== '';

      // 情况1：未作答的题目 -> 加入错题本（标记为未作答）
      if (!hasAnswer) {
        unansweredCount++;
        console.log('[确认任务] 题目未作答:', question.id);
        
        // 检查是否已存在
        const existing = await prisma.wrongQuestion.findFirst({
          where: { childId: task.childId, questionId: question.id },
        });
        
        if (existing) {
          // 更新记录
          await prisma.wrongQuestion.update({
            where: { id: existing.id },
            data: { 
              wrongAnswer: { type: 'NOT_ANSWERED', answer: null },
              attempts: existing.attempts + 1,
              lastAttempt: new Date(),
            },
          });
          console.log('[确认任务] 更新未作答记录:', existing.id);
        } else {
          // 创建新记录
          const created = await prisma.wrongQuestion.create({
            data: {
              childId: task.childId,
              questionId: question.id,
              wrongAnswer: { type: 'NOT_ANSWERED', answer: null },
              attempts: 1,
              lastAttempt: new Date(),
              source: 'PRACTICE',
            },
          });
          console.log('[确认任务] 创建未作答记录:', created.id);
        }
        continue;
      }

      // 情况2：作答了但没有正确答案（如题目未设置答案） -> 跳过
      if (!correctAnswer) {
        continue;
      }

      // 判断对错
      const isCorrect = String(childAnswer).trim().toUpperCase() === String(correctAnswer).trim().toUpperCase();

      if (isCorrect) {
        // 答对：标记为已掌握（从错题本中移除或创建已掌握记录）
        correctCount++;
        const existingWrong = await prisma.wrongQuestion.findFirst({
          where: { childId: task.childId, questionId: question.id, mastered: false },
        });
        if (existingWrong) {
          await prisma.wrongQuestion.update({
            where: { id: existingWrong.id },
            data: { mastered: true, masteryLevel: 5, lastReview: new Date() },
          });
        }
        const existingMastered = await prisma.wrongQuestion.findFirst({
          where: { childId: task.childId, questionId: question.id, mastered: true },
        });
        if (!existingMastered && !existingWrong) {
          await prisma.wrongQuestion.create({
            data: {
              childId: task.childId,
              questionId: question.id,
              mastered: true,
              masteryLevel: 5,
              source: 'PRACTICE',
              lastReview: new Date(),
            },
          });
        }
      } else {
        // 答错：加入易错题库
        wrongCount++;
        const existing = await prisma.wrongQuestion.findFirst({
          where: { childId: task.childId, questionId: question.id, mastered: false },
        });
        if (existing) {
          await prisma.wrongQuestion.update({
            where: { id: existing.id },
            data: { 
              wrongAnswer: { type: 'WRONG', answer: childAnswer },
              attempts: { increment: 1 }, 
              lastAttempt: new Date() 
            },
          });
        } else {
          await prisma.wrongQuestion.create({
            data: {
              childId: task.childId,
              questionId: question.id,
              wrongAnswer: { type: 'WRONG', answer: childAnswer },
              attempts: 1,
              lastAttempt: new Date(),
              source: 'PRACTICE',
            },
          });
        }
      }
    }

    const updatedTask = await prisma.practiceTask.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // 发送通知给孩子
    let content = `家长已确认您完成了 "${task.title}"`;
    if (wrongCount > 0 || unansweredCount > 0) {
      const parts = [];
      if (wrongCount > 0) parts.push(`${wrongCount}道错题`);
      if (unansweredCount > 0) parts.push(`${unansweredCount}道未作答`);
      content += `。其中有${parts.join('和')}已加入错题本，请及时复习。`;
    }
    
    await prisma.notification.create({
      data: {
        userId: task.childId,
        userType: "CHILD",
        type: "TASK_CONFIRMED",
        title: "任务已完成确认",
        content,
        taskId: task.id,
      },
    });

    console.log('[确认任务] 完成统计 - 答对:', correctCount, '答错:', wrongCount, '未作答:', unansweredCount);

    return NextResponse.json({
      success: true,
      status: updatedTask.status,
      summary: {
        correctCount,
        wrongCount,
        unansweredCount,
      },
    });
  } catch (error) {
    console.error("确认任务失败:", error);
    return NextResponse.json({ error: "确认失败" }, { status: 500 });
  }
}
