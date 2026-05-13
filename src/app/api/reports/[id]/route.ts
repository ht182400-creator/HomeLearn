import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 获取单个学习报告详情
 * GET /api/reports/:id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = params;

    // 查询报告详情
    const report = await prisma.learningReport.findUnique({
      where: { id },
      include: {
        child: {
          select: {
            id: true,
            nickname: true,
            grade: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "报告不存在" }, { status: 404 });
    }

    // 验证报告归属
    const child = await prisma.childAccount.findFirst({
      where: { id: report.childId, userId: session.user.id },
    });

    if (!child) {
      return NextResponse.json({ error: "无权查看此报告" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("获取报告详情失败:", error);
    return NextResponse.json(
      { error: "获取报告详情失败" },
      { status: 500 }
    );
  }
}
