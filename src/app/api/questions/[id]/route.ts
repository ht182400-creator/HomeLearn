import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { UpdateQuestionSchema } from "@/lib/validators/question";
import { authOptions } from "@/lib/auth";

// GET /api/questions/[id] - 获取题目详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const question = await prisma.question.findUnique({
      where: { id: params.id },
      include: {
        subject: true,
        grade: true,
        creator: {
          select: { id: true, name: true },
        },
      },
    });

    if (!question) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    // 验证权限（只有创建者或管理员可以查看）
    if (question.creatorId !== session.user.id) {
      return NextResponse.json({ error: "无权限查看" }, { status: 403 });
    }

    return NextResponse.json({ question });
  } catch (error) {
    console.error("Failed to fetch question:", error);
    return NextResponse.json(
      { error: "获取题目详情失败" },
      { status: 500 }
    );
  }
}

// PUT /api/questions/[id] - 更新题目
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();

    // 验证输入
    const validatedData = UpdateQuestionSchema.parse({
      ...body,
      id: params.id,
    });

    // 检查题目是否存在且属于当前用户
    const existingQuestion = await prisma.question.findUnique({
      where: { id: params.id },
    });

    if (!existingQuestion) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    if (existingQuestion.creatorId !== session.user.id) {
      return NextResponse.json({ error: "无权限修改" }, { status: 403 });
    }

    // 更新题目
    const question = await prisma.question.update({
      where: { id: params.id },
      data: {
        content: validatedData.content,
        type: validatedData.type,
        subjectId: validatedData.subjectId,
        gradeId: validatedData.gradeId,
        difficulty: validatedData.difficulty,
        answer: validatedData.answer,
        explanation: validatedData.explanation,
        tags: validatedData.tags,
        childId: validatedData.childId,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "题目更新成功",
      question,
    });
  } catch (error: any) {
    console.error("Failed to update question:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "数据验证失败", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "更新题目失败" },
      { status: 500 }
    );
  }
}

// DELETE /api/questions/[id] - 删除题目
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    // 检查题目是否存在且属于当前用户
    const existingQuestion = await prisma.question.findUnique({
      where: { id: params.id },
    });

    if (!existingQuestion) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    if (existingQuestion.creatorId !== session.user.id) {
      return NextResponse.json({ error: "无权限删除" }, { status: 403 });
    }

    // 删除题目
    await prisma.question.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "题目删除成功" });
  } catch (error) {
    console.error("Failed to delete question:", error);
    return NextResponse.json(
      { error: "删除题目失败" },
      { status: 500 }
    );
  }
}
