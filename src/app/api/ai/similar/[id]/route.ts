import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * 删除变式题
 * DELETE /api/ai/similar/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const { id } = params;

    // 验证变式题属于当前用户
    const similarQuestion = await prisma.similarQuestion.findFirst({
      where: {
        id,
        parentId: session.user.id,
      },
    });

    if (!similarQuestion) {
      return NextResponse.json({ success: false, error: "变式题不存在" }, { status: 404 });
    }

    // 删除变式题
    await prisma.similarQuestion.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "删除成功" });
  } catch (error) {
    console.error("删除变式题失败:", error);
    return NextResponse.json({ success: false, error: "服务器错误" }, { status: 500 });
  }
}

/**
 * 获取单个变式题详情
 * GET /api/ai/similar/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const { id } = params;

    const similarQuestion = await prisma.similarQuestion.findFirst({
      where: {
        id,
        parentId: session.user.id,
      },
      include: {
        originalQuestion: {
          include: {
            subject: true,
          },
        },
      },
    });

    if (!similarQuestion) {
      return NextResponse.json({ success: false, error: "变式题不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, question: similarQuestion });
  } catch (error) {
    console.error("获取变式题详情失败:", error);
    return NextResponse.json({ success: false, error: "服务器错误" }, { status: 500 });
  }
}
