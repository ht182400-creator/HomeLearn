import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/questions/grades - 获取年级列表
export async function GET(request: NextRequest) {
  try {
    const grades = await prisma.grade.findMany({
      orderBy: [
        { level: "asc" },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        level: true,
        description: true,
      },
    });

    return NextResponse.json({ grades });
  } catch (error) {
    console.error("Failed to fetch grades:", error);
    return NextResponse.json(
      { error: "获取年级列表失败" },
      { status: 500 }
    );
  }
}
