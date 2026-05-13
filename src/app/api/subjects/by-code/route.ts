import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/subjects/by-code?code=math - 按代码获取学科
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: '请提供学科代码' },
        { status: 400 }
      );
    }

    const subject = await prisma.subject.findFirst({
      where: {
        OR: [
          { code: code.toLowerCase() },
          { code: code },
          { name: { contains: code } },
        ],
      },
    });

    if (!subject) {
      return NextResponse.json(
        { error: '未找到该学科' },
        { status: 404 }
      );
    }

    return NextResponse.json({ subject });
  } catch (error) {
    console.error('按代码获取学科失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
