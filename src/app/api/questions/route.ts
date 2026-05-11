import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

// 获取题目列表
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const type = searchParams.get('type');

    const where: any = { userId: session.user.id };

    if (subject) {
      where.subject = { code: subject };
    }

    if (type) {
      where.type = type;
    }

    const questions = await prisma.question.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        subject: true,
      },
      take: 100,
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error('获取题目列表失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 创建题目
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { subjectId, type, difficulty, content, answer, analysis } = body;

    if (!subjectId || !type || !content || !answer) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const question = await prisma.question.create({
      data: {
        userId: session.user.id,
        subjectId,
        type,
        difficulty: difficulty || 3,
        content,
        answer,
        analysis: analysis || null,
        status: 'PUBLISHED',
      },
      include: {
        subject: true,
      },
    });

    return NextResponse.json(question);
  } catch (error) {
    console.error('创建题目失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
