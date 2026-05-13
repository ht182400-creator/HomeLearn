'use client';

/**
 * 已掌握题库页面
 * @description 学生查看已掌握的题目，支持按学科筛选
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Search,
  Trophy,
  CheckCircle2,
  Eye,
  Loader2,
  FileQuestion,
  BookOpen,
  Sparkles,
  Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

interface Question {
  id: string;
  masteryLevel: number;
  attempts: number;
  lastReview: string | null;
  question: {
    id: string;
    type: string;
    difficulty: number;
    content: any;
    answer: any;
    subject: { id: string; name: string; color: string };
  };
}

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface Stats {
  total: number;
  mastered: number;
  wrong: number;
}

export default function MasteredPage() {
  const { showToast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, mastered: 0, wrong: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [viewingQuestion, setViewingQuestion] = useState<Question | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, [selectedSubject]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ type: 'mastered' });
      if (selectedSubject) params.set('subjectId', selectedSubject);
      
      const res = await fetch(`/api/student/questions?${params}`);
      const data = await res.json();
      
      if (res.ok) {
        setQuestions(data.questions || []);
        setSubjects(data.subjects || []);
        setStats(data.stats || { total: 0, mastered: 0, wrong: 0 });
      } else {
        showToast(data.error || '获取数据失败', 'error');
      }
    } catch (error) {
      console.error('获取已掌握题库失败:', error);
      showToast('获取数据失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 获取内容预览
  const getContentPreview = (content: any) => {
    if (!content) return '题目内容';
    if (typeof content === 'string') {
      return content.replace(/<[^>]*>/g, '').trim().slice(0, 60);
    }
    if (content?.blocks) {
      return content.blocks
        .filter((b: any) => b.type === 'paragraph')
        .map((b: any) => b.content)
        .join(' ')
        .slice(0, 60);
    }
    return '题目内容';
  };

  // 获取掌握等级显示
  const getMasteryBadge = (level: number) => {
    if (level >= 5) return <Badge className="bg-green-500">完全掌握</Badge>;
    if (level >= 4) return <Badge className="bg-emerald-400">已掌握</Badge>;
    if (level >= 3) return <Badge className="bg-yellow-400 text-black">基本掌握</Badge>;
    return <Badge variant="secondary">还需巩固</Badge>;
  };

  // 过滤题目
  const filteredQuestions = questions.filter((wq) => {
    if (!search) return true;
    const content = getContentPreview(wq.question.content);
    return content.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/student">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">已掌握题库</h1>
                  <p className="text-sm text-muted-foreground">你已经掌握的题目</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/student/wrong">
                <Button variant="outline" size="sm">
                  <Brain className="h-4 w-4 mr-2" />
                  易错题库
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <CardContent className="pt-4 text-center">
              <div className="w-10 h-10 rounded-full bg-green-100 mx-auto mb-2 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.mastered}</p>
              <p className="text-xs text-muted-foreground">已掌握</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <CardContent className="pt-4 text-center">
              <div className="w-10 h-10 rounded-full bg-red-100 mx-auto mb-2 flex items-center justify-center">
                <Brain className="h-5 w-5 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.wrong}</p>
              <p className="text-xs text-muted-foreground">易错题</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <CardContent className="pt-4 text-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 mx-auto mb-2 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.mastered > 0 ? Math.round((stats.mastered / (stats.mastered + stats.wrong)) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">掌握率</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索已掌握的题目..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="">全部学科</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Questions List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredQuestions.length === 0 ? (
          <Card className="py-12 text-center">
            <FileQuestion className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              {questions.length === 0 ? '还没有已掌握的题目' : '没有找到匹配的题目'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {questions.length === 0 
                ? '完成家长推送的任务并确认后，答对的题目会自动进入这里'
                : '尝试调整搜索条件'}
            </p>
            {questions.length === 0 && (
              <Link href="/student/tasks">
                <Button>
                  <BookOpen className="h-4 w-4 mr-2" />
                  去完成任务
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((wq) => (
              <Card key={wq.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {/* 左侧：内容区域 */}
                    <div className="flex-1 min-w-0">
                      {/* 标签行 */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span 
                          className="text-xs px-2 py-1 rounded"
                          style={{ backgroundColor: wq.question.subject.color + '20', color: wq.question.subject.color }}
                        >
                          {wq.question.subject.name}
                        </span>
                        {getMasteryBadge(wq.masteryLevel)}
                        <span className="text-xs text-muted-foreground">
                          复习 {wq.attempts} 次
                        </span>
                      </div>
                      {/* 题目内容预览 */}
                      <p className="text-base text-gray-700">
                        {getContentPreview(wq.question.content)}
                        {getContentPreview(wq.question.content).length >= 60 && '...'}
                      </p>
                      {/* 时间信息 */}
                      <p className="text-xs text-muted-foreground mt-2">
                        最后复习: {wq.lastReview ? new Date(wq.lastReview).toLocaleDateString('zh-CN') : '暂无记录'}
                      </p>
                    </div>

                    {/* 右侧：操作按钮 */}
                    <div className="flex-shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setViewingQuestion(wq)}
                        className="h-10 w-10"
                      >
                        <Eye className="h-5 w-5 text-blue-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* 题目详情弹窗 */}
      {viewingQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">已掌握题目</h3>
                  <p className="text-xs text-muted-foreground">掌握等级: {viewingQuestion.masteryLevel}/5</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setViewingQuestion(null)}
              >
                ✕
              </Button>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* 学科标签 */}
              <div className="flex items-center gap-2 mb-4">
                <span 
                  className="text-xs px-2 py-1 rounded"
                  style={{ backgroundColor: viewingQuestion.question.subject.color + '20', color: viewingQuestion.question.subject.color }}
                >
                  {viewingQuestion.question.subject.name}
                </span>
                {getMasteryBadge(viewingQuestion.masteryLevel)}
              </div>

              {/* 题目内容 */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">题目内容</h4>
                <div 
                  className="p-4 bg-gray-50 rounded-lg text-base"
                  dangerouslySetInnerHTML={{
                    __html: typeof viewingQuestion.question.content === 'string' 
                      ? viewingQuestion.question.content 
                      : '<p>' + (viewingQuestion.question.content?.blocks?.map((b: any) => b.content).join('') || '') + '</p>'
                  }}
                />
              </div>

              {/* 正确答案 */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-green-600 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  正确答案
                </h4>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  {typeof viewingQuestion.question.answer === 'string' 
                    ? viewingQuestion.question.answer 
                    : JSON.stringify(viewingQuestion.question.answer)}
                </div>
              </div>

              {/* 复习统计 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 mb-1">复习次数</p>
                  <p className="text-xl font-bold text-blue-700">{viewingQuestion.attempts}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-600 mb-1">掌握等级</p>
                  <p className="text-xl font-bold text-purple-700">{viewingQuestion.masteryLevel}/5</p>
                </div>
              </div>
            </div>

            {/* 弹窗底部 */}
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <Button variant="outline" onClick={() => setViewingQuestion(null)}>
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
