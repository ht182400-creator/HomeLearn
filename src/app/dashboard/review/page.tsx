"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Clock,
  Target,
  Trophy,
  ChevronRight,
  Brain,
  Calendar,
  TrendingUp,
} from "lucide-react";

interface Child {
  id: string;
  name: string;
  grade: {
    name: string;
  };
}

interface ReviewStats {
  totalToReview: number;
  newQuestions: number;
  learningQuestions: number;
  familiarQuestions: number;
  masteredQuestions: number;
}

export default function ReviewPage() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  // 加载孩子列表
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await fetch("/api/children");
        const data = await res.json();
        if (data.success) {
          setChildren(data.data);
          if (data.data.length > 0 && !selectedChildId) {
            setSelectedChildId(data.data[0].id);
          }
        }
      } catch (error) {
        console.error("加载孩子列表失败:", error);
      }
    };
    fetchChildren();
  }, []);

  // 加载复习统计
  useEffect(() => {
    if (!selectedChildId) return;

    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const res = await fetch(`/api/review/schedule?childId=${selectedChildId}&limit=100`);
        const data = await res.json();
        if (data.success) {
          setStats(data.data.stats);
        }
      } catch (error) {
        console.error("加载复习统计失败:", error);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [selectedChildId]);

  const handleStartReview = () => {
    if (!selectedChildId) return;
    router.push(`/dashboard/review/${selectedChildId}`);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          错题复习
        </h1>
        <p className="text-muted-foreground mt-2">
          基于艾宾浩斯遗忘曲线，科学安排复习时间
        </p>
      </div>

      {/* 孩子选择器 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">选择学习账户</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedChildId} onValueChange={setSelectedChildId}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="请选择孩子账户" />
            </SelectTrigger>
            <SelectContent>
              {children.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.name} - {child.grade.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* 复习统计 */}
      {loadingStats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-24" />
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {/* 今日待复习 */}
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">今日待复习</p>
                  <p className="text-3xl font-bold text-primary">
                    {stats.totalToReview}
                  </p>
                </div>
                <Target className="h-10 w-10 text-primary/40" />
              </div>
            </CardContent>
          </Card>

          {/* 新学 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">新学</p>
                  <p className="text-3xl font-bold">{stats.newQuestions}</p>
                </div>
                <BookOpen className="h-10 w-10 text-blue-500/40" />
              </div>
            </CardContent>
          </Card>

          {/* 学习中 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">学习中</p>
                  <p className="text-3xl font-bold">{stats.learningQuestions}</p>
                </div>
                <TrendingUp className="h-10 w-10 text-orange-500/40" />
              </div>
            </CardContent>
          </Card>

          {/* 熟悉 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">熟悉</p>
                  <p className="text-3xl font-bold">{stats.familiarQuestions}</p>
                </div>
                <Clock className="h-10 w-10 text-green-500/40" />
              </div>
            </CardContent>
          </Card>

          {/* 已精通 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已精通</p>
                  <p className="text-3xl font-bold">{stats.masteredQuestions}</p>
                </div>
                <Trophy className="h-10 w-10 text-yellow-500/40" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* 开始复习按钮 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h3 className="font-semibold text-lg">开始今日复习</h3>
              <p className="text-sm text-muted-foreground">
                {stats?.totalToReview ? `还有 ${stats.totalToReview} 道题目等待复习` : "请先选择学习账户"}
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleStartReview}
              disabled={!selectedChildId || !stats?.totalToReview || loading}
              className="gap-2"
            >
              {loading ? "加载中..." : "开始复习"}
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 艾宾浩斯说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            复习时间表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
            {[
              { day: "第1天", label: "初次学习" },
              { day: "第2天", label: "第1次复习" },
              { day: "第4天", label: "第2次复习" },
              { day: "第7天", label: "第3次复习" },
              { day: "第15天", label: "第4次复习" },
              { day: "第30天", label: "第5次复习" },
            ].map((item, index) => (
              <div
                key={index}
                className="bg-muted/50 rounded-lg p-3"
              >
                <p className="font-semibold text-primary">{item.day}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            按照艾宾浩斯遗忘曲线科学复习，5次正确后即可完全掌握！
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
