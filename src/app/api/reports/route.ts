import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getReportsSchema } from "@/lib/validators/report";

/**
 * 获取学习报告列表
 * GET /api/reports
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");
    const type = searchParams.get("type") as "DAILY" | "WEEKLY" | "MONTHLY" | null;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    if (!childId) {
      return NextResponse.json({ error: "请选择孩子账户" }, { status: 400 });
    }

    // 验证孩子账户归属
    const child = await prisma.childAccount.findFirst({
      where: { id: childId, userId: session.user.id },
    });

    if (!child) {
      return NextResponse.json({ error: "孩子账户不存在" }, { status: 404 });
    }

    // 构建查询条件
    const where: Record<string, unknown> = { childId };
    if (type) {
      where.type = type;
    }

    // 查询报告列表
    const [reports, total] = await Promise.all([
      prisma.learningReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.learningReport.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        reports,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error) {
    console.error("获取学习报告列表失败:", error);
    return NextResponse.json(
      { error: "获取学习报告列表失败" },
      { status: 500 }
    );
  }
}
