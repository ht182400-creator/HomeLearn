/**
 * 站内通知 API
 * @description 获取、标记已读通知
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 获取通知列表
 * GET /api/notifications
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isRead = searchParams.get("isRead");
    const limit = parseInt(searchParams.get("limit") || "20");

    // 查找用户的所有通知
    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
        ...(isRead !== null && { isRead: isRead === "true" }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // 获取未读数量
    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    });

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("获取通知失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

/**
 * 标记通知为已读
 * POST /api/notifications
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      // 标记所有通知为已读
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });
    } else if (notificationId) {
      // 标记单条通知为已读
      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("标记已读失败:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
