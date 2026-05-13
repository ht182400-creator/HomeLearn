import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// 获取学科列表（无需认证，学科是公共数据）
export async function GET() {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ subjects });
  } catch (error) {
    console.error('获取学科列表失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
