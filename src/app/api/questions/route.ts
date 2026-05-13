import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import {
  CreateQuestionSchema,
  QueryQuestionsSchema,
  BatchCreateQuestionSchema,
} from "@/lib/validators/question";
import { authOptions } from "@/lib/auth";

// GET /api/questions - 获取题目列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      subjectId: searchParams.get("subjectId") || undefined,
      type: searchParams.get("type") || undefined,
      difficulty: searchParams.get("difficulty") || undefined,
      grade: searchParams.get("grade") || undefined,
      keyword: searchParams.get("keyword") || undefined,
      page: searchParams.get("page") || "1",
      pageSize: searchParams.get("pageSize") || "20",
    };

    // 验证查询参数
    const validatedQuery = QueryQuestionsSchema.parse(queryParams);
    const { page, pageSize, keyword, ...filters } = validatedQuery;

    // 构建查询条件
    const where: any = {
      userId: session.user.id, // 只显示当前用户创建的题目
    };

    // 学科筛选（支持 subjectId 按 ID 查询 或 subject 按 code 查询）
    if (filters.subjectId) {
      where.subjectId = filters.subjectId;
    } else if (searchParams.get('subject')) {
      // 支持通过学科 code 筛选（从 Dashboard 首页跳转时使用）
      const subjectCode = searchParams.get('subject');
      const subjectByCode = await prisma.subject.findUnique({
        where: { code: subjectCode },
        select: { id: true },
      });
      if (subjectByCode) {
        where.subjectId = subjectByCode.id;
      }
    }

    // 类型筛选
    if (filters.type) {
      where.type = filters.type;
    }

    // 难度筛选
    if (filters.difficulty) {
      where.difficulty = filters.difficulty;
    }

    // 年级筛选 - Prisma 枚举类型需要显式匹配
    if (filters.grade) {
      where.grade = filters.grade;
    }

    console.log("[Questions API] 查询条件:", JSON.stringify(where, null, 2));

    // 关键词搜索
    if (keyword) {
      where.OR = [
        { content: { contains: keyword, mode: "insensitive" } },
        { tags: { contains: keyword, mode: "insensitive" } },
      ];
    }

    // 查询总数
    const total = await prisma.question.count({ where });

    // 查询列表
    const questions = await prisma.question.findMany({
      where,
      include: {
        subject: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      questions,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch questions:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "查询参数错误", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "获取题目列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/questions - 创建题目
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();

    // 验证输入
    const validatedData = CreateQuestionSchema.parse(body);

    // 解析标签：将逗号分隔的字符串转为数组
    const tagNames = validatedData.tags
      ? validatedData.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean)
      : [];

    // 创建题目
    const question = await prisma.question.create({
      data: {
        // Json 字段，content 和 answer 是富文本 HTML，analysis 是解析
        content: validatedData.content,
        type: validatedData.type,
        subjectId: validatedData.subjectId,
        difficulty: typeof validatedData.difficulty === 'number' 
          ? validatedData.difficulty 
          : (validatedData.difficulty === 'EASY' ? 1 : validatedData.difficulty === 'MEDIUM' ? 3 : 5),
        answer: validatedData.answer,
        analysis: validatedData.explanation || undefined,
        userId: session.user.id,
        // 处理标签关联：查找或创建 Tag，再创建 QuestionTag 关联
        ...(tagNames.length > 0 && {
          questionTags: {
            create: await Promise.all(
              tagNames.map(async (name) => {
                // 查找或创建标签（同一用户下唯一）
                const tag = await prisma.tag.upsert({
                  where: { userId_name: { userId: session.user.id, name } },
                  update: {},
                  create: { userId: session.user.id, name },
                });
                return { tagId: tag.id };
              })
            ),
          },
        }),
      },
      include: {
        subject: true,
      },
    });

    return NextResponse.json(
      {
        message: "题目创建成功",
        question,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Failed to create question:", error);

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
      { error: "创建题目失败", details: error.message },
      { status: 500 }
    );
  }
}
