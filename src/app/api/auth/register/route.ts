import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, username, password } = await request.json();

    // 验证必填字段
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: '请填写所有必填字段' },
        { status: 400 }
      );
    }

    // 检查邮箱是否已存在
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 400 }
      );
    }

    // 检查用户名是否已存在
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      return NextResponse.json(
        { error: '该用户名已被使用' },
        { status: 400 }
      );
    }

    // 密码加密
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        role: 'PARENT',
      },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
      },
    });

    // 创建默认学科（如果不存在）
    await prisma.subject.createMany({
      data: [
        { name: '数学', code: 'MATH', color: '#3B82F6', order: 1 },
        { name: '英语', code: 'ENGLISH', color: '#10B981', order: 2 },
        { name: '语文', code: 'CHINESE', color: '#F59E0B', order: 3 },
        { name: '物理', code: 'PHYSICS', color: '#8B5CF6', order: 4 },
        { name: '化学', code: 'CHEMISTRY', color: '#EC4899', order: 5 },
      ],
      skipDuplicates: true,
    });

    return NextResponse.json({
      message: '注册成功',
      user,
    });
  } catch (error) {
    console.error('注册错误:', error);
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
