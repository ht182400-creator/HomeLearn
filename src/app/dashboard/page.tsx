import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  BookOpen, 
  Users, 
  FileQuestion, 
  Target, 
  Plus,
  Brain,
  Mic,
  Sparkles,
  TrendingUp,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SignOutButton } from './components/SignOutButton';
import prisma from '@/lib/db';
import { NotificationBell } from './components/NotificationBell';

/**
 * 提取题目内容预览文本
 * 支持字符串 HTML 和 Tiptap JSON 格式
 */
function getQuestionContentPreview(content: any): string {
  if (!content) return '';

  if (typeof content === 'string') {
    const text = content.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
    if (!text) return '[图片/富媒体题目]';
    return text.length > 30 ? text.slice(0, 30) : text;
  }

  if (content?.type === 'doc' && Array.isArray(content.content)) {
    const texts: string[] = [];
    for (const block of content.content) {
      if (Array.isArray(block?.content)) {
        for (const inline of block.content) {
          if (inline?.type === 'text' && inline.text) texts.push(inline.text);
        }
      }
      if (block?.type === 'image') return '[图片题目]';
    }
    const result = texts.join(' ').trim();
    if (!result) return '[图片/富媒体题目]';
    return result.length > 30 ? result.slice(0, 30) : result;
  }

  if (Array.isArray(content?.blocks)) {
    const text = content.blocks
      .filter((b: any) => b.type === 'paragraph')
      .map((b: any) => typeof b.content === 'string' ? b.content : '')
      .join(' ')
      .trim();
    if (text) return text.length > 30 ? text.slice(0, 30) : text;
  }

  return '';
}

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  const [childrenCount, questionsCount, subjects] = await Promise.all([
    prisma.childAccount.count({ where: { userId: session.user.id } }),
    prisma.question.count({ where: { userId: session.user.id } }),
    prisma.subject.findMany({ orderBy: { order: 'asc' } }),
  ]);

  const recentQuestions = await prisma.question.findMany({
    where: { userId: session.user.id },
    take: 6,
    orderBy: { createdAt: 'desc' },
    include: { subject: true },
  });

  const totalQuestions = questionsCount;

  return (
    <div className="min-h-screen soft-gradient-bg">
      {/* Header */}
      <header className="header-glass sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="h-9 w-9 rounded-xl brand-gradient flex items-center justify-center logo-3d transition-all duration-300 group-hover:scale-105">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight gradient-text">甜家学</span>
              </Link>
              <div className="hidden sm:flex items-center gap-2 ml-2 px-3 py-1.5 rounded-full bg-muted/60 border border-border/50">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">控制台</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell userId={session.user.id} />
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-white">
                    {(session.user.name || session.user.email || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground max-w-[120px] truncate">
                  {session.user.name || session.user.email}
                </span>
              </div>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pb-16">
        
        {/* Welcome Section */}
        <div className="relative mb-10 overflow-hidden rounded-2xl welcome-card-3d p-8 md:p-10 animate-fade-up">
          <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-violet-200/30 via-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-gradient-to-tr from-cyan-200/25 via-accent/10 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
          <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-11 w-11 rounded-xl brand-gradient flex items-center justify-center shadow-lg shadow-primary/30 animate-float-3d">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                欢迎回来，<span className="gradient-text">{session.user.name || '家长'}</span>
              </h1>
            </div>
            <p className="text-muted-foreground text-lg max-w-xl">
              管理您的家庭学习平台，用 AI 陪伴孩子成长每一步
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatCard 
            icon={<Users className="h-6 w-6" />}
            gradient="from-blue-500/20 to-blue-600/5"
            color="text-blue-600"
            shadow="blue"
            label="孩子账户"
            value={childrenCount}
            href="/dashboard/children"
            delay={0}
          />
          <StatCard 
            icon={<FileQuestion className="h-6 w-6" />}
            gradient="from-violet-500/20 to-violet-600/5"
            color="text-violet-600"
            shadow="violet"
            label="题目总数"
            value={questionsCount}
            href="/dashboard/questions"
            delay={100}
          />
          <StatCard 
            icon={<Target className="h-6 w-6" />}
            gradient="from-amber-500/20 to-amber-600/5"
            color="text-amber-600"
            shadow="amber"
            label="错题待复习"
            value="--"
            href="/dashboard/review"
            delay={200}
          />
          <StatCard 
            icon={<TrendingUp className="h-6 w-6" />}
            gradient="from-emerald-500/20 to-emerald-600/5"
            color="text-emerald-600"
            shadow="emerald"
            label="本周练习"
            value="--"
            href="/dashboard/reports"
            delay={300}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Children */}
          <div className="manage-card-3d p-6 animate-fade-up delay-100">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 flex items-center justify-center icon-embossed">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold">孩子账户</h2>
              </div>
              <Link href="/dashboard/children">
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-primary/5 font-medium">
                  <Plus className="h-4 w-4 mr-1" />
                  添加
                </Button>
              </Link>
            </div>
            {childrenCount === 0 ? (
              <div className="text-center py-10">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mx-auto mb-4 icon-embossed">
                  <Users className="h-7 w-7 text-gray-400" />
                </div>
                <p className="text-muted-foreground mb-3 font-medium">还没有添加孩子账户</p>
                <Link href="/dashboard/children">
                  <Button size="sm" className="bg-gradient-to-r from-primary to-violet-500 hover:shadow-lg hover:shadow-primary/25 transition-all">
                    添加第一个孩子
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-md">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">已管理 {childrenCount} 位学员</p>
                  <p className="text-xs text-muted-foreground mt-0.5">点击右上角可继续添加</p>
                </div>
              </div>
            )}
          </div>

          {/* Questions */}
          <div className="manage-card-3d p-6 animate-fade-up delay-200">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center icon-embossed">
                  <FileQuestion className="h-5 w-5 text-violet-600" />
                </div>
                <h2 className="text-lg font-semibold">错题集</h2>
              </div>
              <Link href="/dashboard/questions">
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-primary/5 font-medium">
                  <Plus className="h-4 w-4 mr-1" />
                  添加
                </Button>
              </Link>
            </div>
            {recentQuestions.length === 0 ? (
              <div className="text-center py-10">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mx-auto mb-4 icon-embossed">
                  <FileQuestion className="h-7 w-7 text-gray-400" />
                </div>
                <p className="text-muted-foreground mb-3 font-medium">还没有录入题目</p>
                <Link href="/dashboard/questions">
                  <Button size="sm" className="bg-gradient-to-r from-primary to-violet-500 hover:shadow-lg hover:shadow-primary/25 transition-all">
                    录入第一道题
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="question-scroll-wrapper">
                <div className="space-y-1">
                  {recentQuestions.map((q, index) => {
                    const preview = getQuestionContentPreview(q.content);
                    return (
                      <div key={q.id} className="flex items-center justify-between group py-1.5 px-2 -mx-2 rounded-md hover:bg-muted/40 transition-colors overflow-hidden" style={{ maxWidth: '100%' }}>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-xs text-muted-foreground/60 font-mono flex-shrink-0 w-5 text-right">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className={`text-sm truncate transition-colors ${!preview ? 'text-muted-foreground italic' : 'text-foreground/85 group-hover:text-foreground'}`}>
                            {preview || '暂无文本预览'}
                          </span>
                        </div>
                        <span 
                          className="tag-badge flex-shrink-0 ml-3"
                          style={{ 
                            backgroundColor: q.subject.color + '22', 
                            color: q.subject.color,
                            borderColor: q.subject.color + '40'
                          }}
                        >
                          {q.subject.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {totalQuestions > recentQuestions.length && (
                  <div className="pt-4 mt-4 border-t border-border/60">
                    <Link href="/dashboard/questions" className="flex items-center justify-center gap-1 text-sm text-primary hover:text-primary/80 font-semibold transition-colors group">
                      查看全部 {totalQuestions} 道错题
                      <svg className="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Subjects */}
        <div className="welcome-card-3d p-6 mb-8 animate-fade-up delay-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center icon-embossed">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">学科概览</h2>
              <p className="text-xs text-muted-foreground">点击查看各科题目</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
            {subjects.map((subject, index) => (
              <Link 
                key={subject.id} 
                href={`/dashboard/questions?subject=${subject.code}`}
                className="group relative p-5 rounded-xl text-center subject-card-3d"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div 
                  className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                  style={{ 
                    background: `linear-gradient(145deg, ${subject.color}25, ${subject.color}10)`,
                    boxShadow: `4px 4px 12px ${subject.color}25, -2px -2px 8px rgba(255,255,255,0.9)`
                  }}
                >
                  <BookOpen className="h-7 w-7 transition-colors duration-300" style={{ color: subject.color }} />
                </div>
                <span className="font-semibold text-sm text-foreground/90 group-hover:text-foreground transition-colors">{subject.name}</span>
                
                <div 
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-500 group-hover:w-8"
                  style={{ backgroundColor: subject.color }}
                />
              </Link>
            ))}
          </div>
        </div>

        {/* AI Features */}
        <div className="relative overflow-hidden rounded-2xl p-6 md:p-8 animate-fade-up delay-400">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-50/80 via-white to-cyan-50/80" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-violet-200/30 via-primary/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-cyan-200/25 via-accent/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-40 h-40 bg-gradient-to-br from-primary/8 to-transparent rounded-full blur-2xl" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30 logo-3d">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">AI 智能功能</h2>
                <p className="text-xs text-muted-foreground">智能辅助，让学习更高效</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-5">
              <div className="ai-card-3d rounded-2xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-100/60 to-transparent rounded-bl-3xl" />
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 flex items-center justify-center mb-4 icon-embossed">
                  <Brain className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-foreground mb-1.5">AI 智能问答</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  拍照即识别，AI 详细讲解每道题
                </p>
              </div>
              
              <div className="ai-card-3d rounded-2xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-100/60 to-transparent rounded-bl-3xl" />
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center mb-4 icon-embossed">
                  <Target className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="font-bold text-foreground mb-1.5">薄弱点诊断</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  基于错题数据，精准定位知识盲区
                </p>
              </div>
              
              <div className="ai-card-3d rounded-2xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-100/60 to-transparent rounded-bl-3xl" />
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center mb-4 icon-embossed">
                  <Mic className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="font-bold text-foreground mb-1.5">英语口语评测</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  音素级评测，标准发音示范
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/** 统计卡片 - 3D 浮雕版 */
function StatCard({ 
  icon, 
  gradient,
  color,
  shadow,
  label, 
  value, 
  href,
  delay = 0,
}: { 
  icon: React.ReactNode;
  gradient: string;
  color: string;
  shadow: 'blue' | 'violet' | 'amber' | 'emerald';
  label: string; 
  value: string | number;
  href: string;
  delay?: number;
}) {
  const shadowColors = {
    blue: 'rgba(59, 130, 246, 0.15)',
    violet: 'rgba(139, 92, 246, 0.15)',
    amber: 'rgba(245, 158, 11, 0.15)',
    emerald: 'rgba(16, 185, 129, 0.15)',
  };
  
  return (
    <Link href={href} className="block animate-fade-up" style={{ animationDelay: `${delay}ms`, opacity: 0 }}>
      <div className="stat-card-3d p-5 group relative overflow-hidden">
        {/* 顶部高光条 */}
        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
        
        {/* 右侧悬浮光效 */}
        <div 
          className="absolute top-0 right-0 w-28 h-28 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `radial-gradient(circle, ${shadowColors[shadow]}, transparent 70%)` }}
        />
        
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">{label}</p>
            <p className="text-3xl font-bold tracking-tight text-foreground animate-count-in" style={{ animationDelay: `${delay + 200}ms`, opacity: 0 }}>
              {value}
            </p>
          </div>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient} ${color} transition-all duration-300 group-hover:scale-110 group-hover:rotate-6`}>
            {icon}
          </div>
        </div>
      </div>
    </Link>
  );
}
