'use client';

/**
 * 学生学习报告页面
 * @description 学生查看自己的学习数据和成长记录
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  Target,
  Clock,
  Trophy,
  BookOpen,
  Brain,
  ArrowLeft,
  Home,
  Calendar,
  ChevronRight,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

interface StudyStats {
  totalPractice: number;
  totalQuestions: number;
  correctCount: number;
  accuracyRate: number;
  totalTime: number;
  wrongCount: number;
  masteredCount: number;
  reviewDue: number;
}

interface SubjectStat {
  subject: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface WeeklyData {
  day: string;
  questions: number;
  correct: number;
}

export default function StudentReportPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载学习数据
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/student/stats');
        const data = await res.json();

        if (res.ok) {
          setStats(data.stats || null);
          setSubjectStats(data.subjectStats || []);
          setWeeklyData(data.weeklyData || []);
        } else {
          showToast(data.error || '获取数据失败', 'error');
        }
      } catch (error) {
        console.error('获取学习数据失败:', error);
        showToast('获取数据失败', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [showToast]);

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
            <Link href="/student">
              <Button variant="outline" size="sm">
                <Home className="h-4 w-4 mr-2" />
                返回主页
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            我的学习报告
          </h1>
          <p className="text-gray-500 mt-2">查看学习进度，了解自己的成长</p>
        </div>

        {/* 数据概览 */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">练习次数</p>
                    <p className="text-3xl font-bold">{stats.totalPractice}</p>
                  </div>
                  <BookOpen className="h-10 w-10 text-blue-500/40" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">完成题目</p>
                    <p className="text-3xl font-bold">{stats.totalQuestions}</p>
                  </div>
                  <Target className="h-10 w-10 text-orange-500/40" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">正确率</p>
                    <p className="text-3xl font-bold text-green-600">
                      {stats.accuracyRate}%
                    </p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-green-500/40" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">学习时长</p>
                    <p className="text-3xl font-bold">{formatTime(stats.totalTime)}</p>
                  </div>
                  <Clock className="h-10 w-10 text-purple-500/40" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 错题与掌握 */}
        {stats && (
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Brain className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="text-sm text-red-600">错题数量</p>
                    <p className="text-2xl font-bold text-red-700">{stats.wrongCount}</p>
                  </div>
                </div>
                <Link href="/student/wrong">
                  <Button variant="outline" size="sm" className="mt-4 w-full">
                    去复习
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-sm text-green-600">已掌握</p>
                    <p className="text-2xl font-bold text-green-700">
                      {stats.masteredCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Star className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="text-sm text-yellow-600">待复习</p>
                    <p className="text-2xl font-bold text-yellow-700">
                      {stats.reviewDue}
                    </p>
                  </div>
                </div>
                <Link href="/student/review">
                  <Button variant="outline" size="sm" className="mt-4 w-full">
                    开始复习
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 学科统计 */}
        {subjectStats.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                学科表现
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subjectStats.map((subject) => (
                  <div key={subject.subject} className="flex items-center gap-4">
                    <div className="w-20 text-sm font-medium">{subject.subject}</div>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${subject.accuracy}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {subject.correct}/{subject.total} ({subject.accuracy}%)
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 本周趋势 */}
        {weeklyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                本周学习趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {weeklyData.map((day) => (
                  <div key={day.day} className="text-center">
                    <p className="text-xs text-gray-500 mb-2">{day.day}</p>
                    <div className="relative h-24 bg-gray-100 rounded-lg overflow-hidden">
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-primary/20 transition-all"
                        style={{
                          height: `${Math.max((day.questions / 20) * 100, 5)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs font-medium mt-1">{day.questions}题</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 无数据提示 */}
        {!stats && !loading && (
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">暂无学习数据</h3>
            <p className="text-sm text-gray-400 mb-6">完成练习后将生成学习报告</p>
            <Link href="/student/tasks">
              <Button>
                <BookOpen className="h-4 w-4 mr-2" />
                去做练习
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
