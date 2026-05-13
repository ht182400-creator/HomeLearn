import { cookies } from 'next/headers';
import prisma from '@/lib/db';

export interface ChildSession {
  childId: string;
  userId: string;
  type: 'child';
  exp: number;
}

export async function getChildSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('child_session');

  if (!sessionCookie) {
    return null;
  }

  try {
    const session: ChildSession = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
    );

    // 检查是否过期
    if (session.exp < Date.now()) {
      return null;
    }

    // 获取孩子信息
    const child = await prisma.childAccount.findUnique({
      where: { id: session.childId },
      include: { user: true },
    });

    if (!child || !child.isActive) {
      return null;
    }

    return {
      child: {
        id: child.id,
        nickname: child.nickname,
        grade: child.grade,
        avatar: child.avatar,
        username: child.username,
      },
      parent: {
        id: child.user.id,
        name: child.user.username,
      },
    };
  } catch {
    return null;
  }
}

export async function requireChildSession() {
  const session = await getChildSession();
  
  if (!session) {
    throw new Error('NOT_AUTHENTICATED');
  }
  
  return session;
}
