import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    // 查找孩子账户
    const child = await prisma.childAccount.findUnique({
      where: { username },
      include: { user: true },
    });

    if (!child || !child.passwordHash) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, child.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 检查是否激活
    if (!child.isActive) {
      return NextResponse.json(
        { success: false, error: '账户已被禁用' },
        { status: 403 }
      );
    }

    // 创建会话 token（简化版，实际应使用 JWT）
    const sessionToken = Buffer.from(
      JSON.stringify({
        childId: child.id,
        userId: child.userId,
        type: 'child',
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7天有效期
      })
    ).toString('base64');

    const response = NextResponse.json({
      success: true,
      data: {
        child: {
          id: child.id,
          nickname: child.nickname,
          grade: child.grade,
          avatar: child.avatar,
        },
        parent: {
          id: child.user.id,
          name: child.user.username,
        },
      },
    });

    // 设置 cookie
    response.cookies.set('child_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Child login error:', error);
    return NextResponse.json(
      { success: false, error: '登录失败' },
      { status: 500 }
    );
  }
}
