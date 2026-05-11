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
      gradeId: searchParams.get("gradeId") || undefined,
      type: searchParams.get("type") || undefined,
      difficulty: searchParams.get("difficulty") || undefined,
      childId: searchParams.get("childId") || undefined,
      keyword: searchParams.get("keyword") || undefined,
      page: searchParams.get("page") || "1",
      pageSize: searchParams.get("pageSize") || "20",
    };

    // 验证查询参数
    const validatedQuery = QueryQuestionsSchema.parse(queryParams);
    const { page, pageSize, keyword, ...filters } = validatedQuery;

    // 构建查询条件
    const where: any = {
      creatorId: session.user.id, // 只显示当前用户创建的题目
      ...filters,
    };

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
          select: { id: true, name: true, icon: true },
        },
        grade: {
          select: { id: true, name: true, level: true },
        },
        child: {
          select: { id: true, name: true },
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

    // 创建题目
    const question = await prisma.question.create({
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
        creatorId: session.user.id,
      },
      include: {
        subject: true,
        grade: true,
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
      return NextResponse.json(
        { error: "数据验证失败", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "创建题目失败" },
      { status: 500 }
    );
  }
}
