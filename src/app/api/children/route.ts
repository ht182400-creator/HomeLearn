import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

// 获取所有孩子账户
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const children = await prisma.childAccount.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(children);
  } catch (error) {
    console.error('获取孩子列表失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 创建孩子账户
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { nickname, grade } = await request.json();

    if (!nickname) {
      return NextResponse.json({ error: '昵称不能为空' }, { status: 400 });
    }

    const child = await prisma.childAccount.create({
      data: {
        userId: session.user.id,
        nickname,
        grade: grade || null,
      },
    });

    return NextResponse.json(child);
  } catch (error) {
    console.error('创建孩子账户失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
