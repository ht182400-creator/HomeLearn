import Link from 'next/link';
import { BookOpen, Brain, Users, Shield, Sparkles, TrendingUp } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">家学 HomeLearn</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium hover:text-primary">
              登录
            </Link>
            <Link
              href="/register"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
            >
              立即开始
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            让每个家庭都拥有
            <span className="text-primary"> AI 学习助手</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            家长主导、数据私有、AI 赋能
            <br />
            科学的错题复习体系，告别无效刷题
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="bg-primary text-primary-foreground px-8 py-4 rounded-lg text-lg font-medium hover:bg-primary/90 transition-colors"
            >
              免费开始使用
            </Link>
            <Link
              href="/login"
              className="border border-input bg-background px-8 py-4 rounded-lg text-lg font-medium hover:bg-accent transition-colors"
            >
              已有账户登录
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            为什么选择家学？
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Brain className="h-10 w-10" />}
              title="AI 智能辅导"
              description="拍照即识别，AI 详细讲解每道题，分步骤引导思考，支持多学科"
            />
            <FeatureCard
              icon={<TrendingUp className="h-10 w-10" />}
              title="科学艾宾浩斯复习"
              description="基于遗忘曲线自动安排复习时间，告别边学边忘，真正记住每道错题"
            />
            <FeatureCard
              icon={<Users className="h-10 w-10" />}
              title="家长深度参与"
              description="家长可手写讲解、录制视频，亲子共学，不只是旁观者"
            />
            <FeatureCard
              icon={<Shield className="h-10 w-10" />}
              title="数据完全私有"
              description="部署在本地，数据不出家门，隐私安全家长掌控"
            />
            <FeatureCard
              icon={<Sparkles className="h-10 w-10" />}
              title="多专项学科支持"
              description="数学公式、几何画板、英语语音评测、文言文注音，全面覆盖"
            />
            <FeatureCard
              icon={<BookOpen className="h-10 w-10" />}
              title="零成本启动"
              description="使用免费 AI API，家庭使用零成本，后续无隐藏费用"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            三步开启智能学习
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StepCard
              number={1}
              title="录入题目"
              description="拍照、手动输入、批量导入，把孩子的作业和试卷变成专属题库"
            />
            <StepCard
              number={2}
              title="AI 智能练习"
              description="选择题型开始练习，AI 即时判题，错题自动收入错题本"
            />
            <StepCard
              number={3}
              title="科学复习"
              description="艾宾浩斯提醒复习，AI 讲解，家长手把手辅导，牢固掌握"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            立即开始，告别无效刷题
          </h2>
          <p className="text-xl opacity-90 mb-8">
            完全免费，5分钟搭建属于你们家庭的学习平台
          </p>
          <Link
            href="/register"
            className="bg-white text-primary px-8 py-4 rounded-lg text-lg font-medium hover:bg-white/90 transition-colors"
          >
            立即免费开始
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 家学 HomeLearn. 数据私有，亲子共学。</p>
          <p className="mt-2">Made with ❤️ for families</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card rounded-xl p-6 border shadow-sm card-hover">
      <div className="text-primary mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
