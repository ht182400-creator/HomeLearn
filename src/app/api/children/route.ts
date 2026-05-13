import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

// 获取所有孩子账户
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('includeStats') === 'true';

    const children = await prisma.childAccount.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: includeStats ? {
        wrongQuestions: {
          where: { mastered: false }, // 只统计未掌握的错题
        },
        practiceRecords: true,
        speechResults: true,
      } : undefined,
    });

    // 处理数据，添加统计信息
    const processedChildren = children.map((child: typeof children[number] & { practiceRecords?: any[]; wrongQuestions?: any[]; speechResults?: any[] }) => {
      const base = {
        id: child.id,
        nickname: child.nickname,
        grade: child.grade,
        avatar: child.avatar,
        username: child.username,
        passwordHash: child.passwordHash,
        createdAt: child.createdAt.toISOString(),
      };

      if (includeStats) {
        // 计算统计数据
        const practiceRecords = child.practiceRecords || [];
        const wrongQuestions = child.wrongQuestions || [];
        const speechResults = child.speechResults || [];
        const totalStudyTime = practiceRecords.reduce((sum, p) => sum + (p.duration || 0), 0) / 60;
        const totalPractice = practiceRecords.length;
        const totalCorrect = practiceRecords.reduce((sum, p) => sum + p.correctCount, 0);
        const wrongCount = wrongQuestions.length;
        
        // 计算待复习数量（根据艾宾浩斯曲线）
        const now = new Date();
        const reviewDue = wrongQuestions.filter(w => 
          w.nextReview && new Date(w.nextReview) <= now
        ).length;

        return {
          ...base,
          stats: {
            totalStudyTime: Math.round(totalStudyTime),
            totalPractice,
            totalCorrect,
            wrongCount,
            reviewDue,
            speechCount: speechResults.length,
          },
        };
      }

      return base;
    });

    return NextResponse.json(processedChildren);
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

    const { nickname, grade, username, password } = await request.json();

    if (!nickname) {
      return NextResponse.json({ error: '昵称不能为空' }, { status: 400 });
    }

    // 如果提供了用户名和密码
    let childData: any = {
      userId: session.user.id,
      nickname,
      grade: grade || null,
    };

    if (username) {
      // 检查用户名是否已被使用
      const existing = await prisma.childAccount.findUnique({
        where: { username },
      });
      if (existing) {
        return NextResponse.json({ error: '用户名已被使用' }, { status: 400 });
      }
      childData.username = username;
      if (password) {
        childData.passwordHash = await bcrypt.hash(password, 10);
      }
    }

    const child = await prisma.childAccount.create({
      data: childData,
    });

    return NextResponse.json({
      ...child,
      hasPassword: !!child.username,
      // 如果设置了登录信息，返回密码（仅在创建时返回一次）
      loginInfo: password ? { username, password } : null,
    });
  } catch (error) {
    console.error('创建孩子账户失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
