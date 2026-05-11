import { auth, signOut } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  BookOpen, 
  Users, 
  FileQuestion, 
  Target, 
  BarChart3, 
  Settings,
  LogOut,
  Plus,
  Brain,
  Mic
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import prisma from '@/lib/db';

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  // 获取统计数据
  const [childrenCount, questionsCount, subjects] = await Promise.all([
    prisma.childAccount.count({ where: { userId: session.user.id } }),
    prisma.question.count({ where: { userId: session.user.id } }),
    prisma.subject.findMany({ orderBy: { order: 'asc' } }),
  ]);

  // 获取最近添加的题目
  const recentQuestions = await prisma.question.findMany({
    where: { userId: session.user.id },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { subject: true },
  });

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <BookOpen className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">家学</span>
              </Link>
              <span className="text-muted-foreground">|</span>
              <span className="font-medium">控制台</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {session.user.email}
              </span>
              <form action={async () => {
                'use server';
                await signOut();
              }}>
                <Button variant="ghost" size="sm" type="submit">
                  <LogOut className="h-4 w-4 mr-2" />
                  退出
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            欢迎回来，{session.user.name || '家长'}
          </h1>
          <p className="text-muted-foreground">
            管理您的家庭学习平台，陪伴孩子成长
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard 
            icon={<Users className="h-6 w-6" />}
            label="孩子账户"
            value={childrenCount}
            href="/dashboard/children"
          />
          <StatCard 
            icon={<FileQuestion className="h-6 w-6" />}
            label="题目总数"
            value={questionsCount}
            href="/dashboard/questions"
          />
          <StatCard 
            icon={<Target className="h-6 w-6" />}
            label="错题待复习"
            value="--"
            href="/dashboard/review"
          />
          <StatCard 
            icon={<BarChart3 className="h-6 w-6" />}
            label="本周练习"
            value="--"
            href="/dashboard/report"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Children Management */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                孩子账户
              </h2>
              <Link href="/dashboard/children">
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  添加
                </Button>
              </Link>
            </div>
            {childrenCount === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>还没有添加孩子账户</p>
                <Link href="/dashboard/children">
                  <Button className="mt-3" size="sm">添加第一个孩子</Button>
                </Link>
              </div>
            ) : (
              <p className="text-muted-foreground">
                已添加 {childrenCount} 个孩子账户
              </p>
            )}
          </div>

          {/* Questions Management */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FileQuestion className="h-5 w-5 text-primary" />
                题目管理
              </h2>
              <Link href="/dashboard/questions">
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  添加
                </Button>
              </Link>
            </div>
            {recentQuestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileQuestion className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>还没有录入题目</p>
                <Link href="/dashboard/questions">
                  <Button className="mt-3" size="sm">录入第一道题</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentQuestions.map((q) => (
                  <div key={q.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm truncate max-w-[200px]">
                      {q.content && typeof q.content === 'object' 
                        ? (q.content as any).blocks?.[0]?.content?.slice(0, 30) || '题目内容'
                        : '题目内容'}
                    </span>
                    <span 
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: q.subject.color + '20', color: q.subject.color }}
                    >
                      {q.subject.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subjects Overview */}
        <div className="bg-white rounded-lg border p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            学科概览
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {subjects.map((subject) => (
              <Link 
                key={subject.id} 
                href={`/dashboard/questions?subject=${subject.code}`}
                className="p-4 rounded-lg border text-center card-hover"
              >
                <div 
                  className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                  style={{ backgroundColor: subject.color + '20' }}
                >
                  <BookOpen className="h-6 w-6" style={{ color: subject.color }} />
                </div>
                <span className="font-medium">{subject.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* AI Features */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI 智能功能
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/80 rounded-lg p-4">
              <Brain className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-medium mb-1">AI 智能问答</h3>
              <p className="text-sm text-muted-foreground">
                拍照即识别，AI 详细讲解每道题
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-4">
              <Target className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-medium mb-1">薄弱点诊断</h3>
              <p className="text-sm text-muted-foreground">
                基于错题数据，精准定位知识盲区
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-4">
              <Mic className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-medium mb-1">英语口语评测</h3>
              <p className="text-sm text-muted-foreground">
                音素级评测，标准发音示范
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  href 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="bg-white rounded-lg border p-4 card-hover">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="text-primary">{icon}</div>
        </div>
      </div>
    </Link>
  );
}
