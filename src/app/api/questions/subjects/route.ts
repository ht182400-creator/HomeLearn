import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

// 获取学科列表
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const subjects = await prisma.subject.findMany({
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(subjects);
  } catch (error) {
    console.error('获取学科列表失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
