import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

// 更新孩子账户
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { nickname, grade } = await request.json();

    // 验证所有权
    const child = await prisma.childAccount.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!child) {
      return NextResponse.json({ error: '账户不存在' }, { status: 404 });
    }

    const updated = await prisma.childAccount.update({
      where: { id: params.id },
      data: {
        nickname,
        grade: grade || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('更新孩子账户失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 删除孩子账户
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 验证所有权
    const child = await prisma.childAccount.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!child) {
      return NextResponse.json({ error: '账户不存在' }, { status: 404 });
    }

    await prisma.childAccount.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除孩子账户失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
