import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getChildSession } from '@/lib/child-session';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { BookOpen, Target, Brain, Mic, BarChart3, Sparkles, Trophy, Clock, ChevronRight, LogOut, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default async function StudentPage() {
  const session = await getChildSession();

  if (!session) {
    redirect('/login');
  }

  // 获取孩子的统计数据和待完成任务
  const [wrongQuestions, reviewStats, practiceStats, pendingTasks] = await Promise.all([
    prisma.wrongQuestion.count({
      where: { childId: session.child.id },
    }),
    prisma.wrongQuestion.findMany({
      where: { childId: session.child.id },
      select: { masteryLevel: true },
    }),
    prisma.practiceRecord.aggregate({
      where: { childId: session.child.id },
      _count: true,
      _sum: { correctCount: true },
    }),
    prisma.practiceTask.count({
      where: {
        childId: session.child.id,
        status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] },
      },
    }),
  ]);

  const masteredCount = reviewStats.filter(w => w.masteryLevel >= 4).length;
  const todayReviewCount = reviewStats.filter(w => w.masteryLevel < 4).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900">甜家学</span>
                <span className="text-sm text-muted-foreground ml-2">学习中心</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">
                你好，{session.child.nickname}！
              </span>
              <form action={async () => {
                'use server';
                const { cookies } = await import('next/headers');
                (await cookies()).delete('child_session');
              }}>
                <Button variant="ghost" size="sm" type="submit" className="gap-1">
                  <LogOut className="h-4 w-4" />
                  退出
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl p-6 mb-8 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">
                {getGreeting()}{session.child.nickname}！
              </h1>
              <p className="opacity-90">
                今天也要加油学习哦 💪
              </p>
            </div>
            <div className="text-6xl">
              {getEmoji()}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <CardContent className="pt-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 mx-auto mb-2 flex items-center justify-center">
                <Target className="h-6 w-6 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{wrongQuestions}</p>
              <p className="text-xs text-muted-foreground">易错题</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <CardContent className="pt-4 text-center">
              <div className="w-12 h-12 rounded-full bg-yellow-100 mx-auto mb-2 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{masteredCount}</p>
              <p className="text-xs text-muted-foreground">已掌握</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <CardContent className="pt-4 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 mx-auto mb-2 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{practiceStats._count}</p>
              <p className="text-xs text-muted-foreground">练习次数</p>
            </CardContent>
          </Card>
        </div>

        {/* Learning Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* 我的任务 */}
          <Link href={`/student/tasks`}>
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer h-full relative overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg">
                      <ClipboardList className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">我的任务</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        查看家长推送的练习任务
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
                {pendingTasks > 0 && (
                  <div className="mt-4 bg-white/80 rounded-lg p-3 flex items-center justify-between">
                    <p className="text-sm text-blue-600">
                      📋 有 <strong>{pendingTasks}</strong> 个待完成任务
                    </p>
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                      新任务
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* 错题复习 */}
          <Link href={`/student/review`}>
            <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center shadow-lg">
                      <Brain className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">错题复习</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        复习之前做错的题目
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
                {todayReviewCount > 0 && (
                  <div className="mt-4 bg-white/80 rounded-lg p-3">
                    <p className="text-sm text-red-600">
                      📚 今天有 <strong>{todayReviewCount}</strong> 道题需要复习
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* 已掌握题库 */}
          <Link href={`/student/mastered`}>
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                      <Trophy className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">已掌握题库</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        查看你已经掌握的题目
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
                {masteredCount > 0 && (
                  <div className="mt-4 bg-white/80 rounded-lg p-3">
                    <p className="text-sm text-green-600">
                      🌟 你已掌握 <strong>{masteredCount}</strong> 道题目
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* 易错题库 */}
          <Link href={`/student/wrong`}>
            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg">
                      <Target className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">易错题库</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        需要加强练习的题目
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
                {wrongQuestions > 0 && (
                  <div className="mt-4 bg-white/80 rounded-lg p-3">
                    <p className="text-sm text-orange-600">
                      📝 共 <strong>{wrongQuestions}</strong> 道易错题
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* AI 问答 */}
          <Link href={`/student/chat`}>
            <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center shadow-lg">
                      <Sparkles className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">AI 问答</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        有问题随时问 AI 老师
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 英语口语 */}
          <Link href={`/student/speech`}>
            <Card className="bg-gradient-to-br from-green-50 to-teal-50 border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center shadow-lg">
                      <Mic className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">英语口语</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        练习英语发音和口语
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 学习报告 */}
          <Link href={`/student/report`}>
            <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
                      <BarChart3 className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">学习报告</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        查看我的学习成长记录
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return '早上好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

function getEmoji() {
  const hour = new Date().getHours();
  if (hour < 12) return '☀️';
  if (hour < 18) return '🌈';
  return '🌙';
}
