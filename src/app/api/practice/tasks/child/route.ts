/**
 * 孩子任务列表 API
 * @description 孩子获取自己的待完成任务列表
 */
import { NextRequest, NextResponse } from "next/server";
import { getChildSession } from "@/lib/child-session";
import { prisma } from "@/lib/prisma";

/**
 * 获取孩子的任务列表
 * GET /api/practice/tasks/child
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getChildSession();
    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const childId = session.child.id;

    const where: any = {
      childId,
    };

    if (status) {
      where.status = status;
    }
    // 不指定status时返回所有任务

    const tasks = await prisma.practiceTask.findMany({
      where,
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [
        { status: "asc" }, // 待完成优先
        { dueDate: "asc" }, // 截止日期近的优先
      ],
    });

    return NextResponse.json({
      tasks,
      childId,
    });
  } catch (error) {
    console.error("获取任务列表失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
