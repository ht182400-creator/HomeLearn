import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { UpdateQuestionSchema } from "@/lib/validators/question";
import { authOptions } from "@/lib/auth";
import { Prisma, Grade } from "@prisma/client";

// 有效的年级枚举值
const VALID_GRADES: Grade[] = [
  "PRIMARY_1", "PRIMARY_2", "PRIMARY_3", "PRIMARY_4", "PRIMARY_5", "PRIMARY_6",
  "MIDDLE_1", "MIDDLE_2", "MIDDLE_3",
  "HIGH_1", "HIGH_2", "HIGH_3"
];

function isValidGrade(value: string): value is Grade {
  return VALID_GRADES.includes(value as Grade);
}

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
      },
    });

    if (!question) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    // 验证权限（只有创建者或管理员可以查看）
    if (question.userId !== session.user.id) {
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

    if (existingQuestion.userId !== session.user.id) {
      return NextResponse.json({ error: "无权限修改" }, { status: 403 });
    }

    // 解析标签：将逗号分隔的字符串转为数组
    const tagNames = validatedData.tags
      ? validatedData.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean)
      : [];

    // 更新题目
    const question = await prisma.question.update({
      where: { id: params.id },
      data: {
        content: validatedData.content,
        type: validatedData.type,
        subject: { connect: { id: validatedData.subjectId } },
        grade: validatedData.gradeId && isValidGrade(validatedData.gradeId) ? validatedData.gradeId : undefined,
        difficulty: typeof validatedData.difficulty === 'number' 
          ? validatedData.difficulty 
          : (validatedData.difficulty === 'EASY' ? 1 : validatedData.difficulty === 'MEDIUM' ? 3 : 5),
        answer: validatedData.answer,
        analysis: validatedData.explanation || undefined,
        updatedAt: new Date(),
        // 处理标签关联：先删除旧关联，再创建新关联
        ...(validatedData.tags !== undefined && {
          questionTags: {
            deleteMany: {},  // 删除所有旧的标签关联
            ...(tagNames.length > 0 && {
              create: await Promise.all(
                tagNames.map(async (name) => {
                  const tag = await prisma.tag.upsert({
                    where: { userId_name: { userId: session.user.id, name } },
                    update: {},
                    create: { userId: session.user.id, name },
                  });
                  return { tagId: tag.id };
                })
              ),
            }),
          },
        }),
      },
    });

    return NextResponse.json({
      message: "题目更新成功",
      question,
    });
  } catch (error: any) {
    console.error("Failed to update question:", error);

    if (error.name === "ZodError") {
      // 提取具体字段错误，给出友好提示
      const fieldErrors = error.errors || [];
      const fieldErrorMap: Record<string, string> = {
        content: "题目内容",
        answer: "答案",
        explanation: "解析",
      };
      
      for (const err of fieldErrors) {
        const field = err.path?.join(".") || "";
        const fieldName = fieldErrorMap[field] || field;
        if (err.message?.includes("过长")) {
          return NextResponse.json(
            { error: `${fieldName}${err.message}`, field },
            { status: 400 }
          );
        }
      }
      
      return NextResponse.json(
        { error: "数据验证失败", details: fieldErrors },
        { status: 400 }
      );
    }

    // 数据库错误
    if (error.code === "P2000") {
      return NextResponse.json(
        { error: "字段值过长，请压缩图片或减少内容", field: "value_too_long" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "更新题目失败", details: error.message },
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

    if (existingQuestion.userId !== session.user.id) {
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
