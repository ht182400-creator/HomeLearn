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
  Home,
  ArrowLeft,
  Send,
  Play,
  List,
} from "lucide-react";

interface Child {
  id: string;
  nickname: string;
  grade: string;
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
  const [pushing, setPushing] = useState(false);

  // 加载孩子列表
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await fetch("/api/children");
        const data = await res.json();
        if (Array.isArray(data)) {
          setChildren(data);
          if (data.length > 0 && !selectedChildId) {
            setSelectedChildId(data[0].id);
          }
        } else if (data.success && data.data) {
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

  const handlePushToStudent = async () => {
    if (!selectedChildId || !stats?.totalToReview) return;

    setPushing(true);
    try {
      const res = await fetch("/api/review/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: selectedChildId,
          taskType: "REVIEW",
          description: `今日复习任务：${stats.totalToReview} 道错题待复习`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("已成功推送给学生！学生端将收到复习提醒。");
      } else {
        alert(data.error || "推送失败，请重试");
      }
    } catch (error) {
      console.error("推送失败:", error);
      alert("推送失败，请重试");
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* 页面标题 */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")} className="gap-1">
            <Home className="h-4 w-4" />
            返回主页
          </Button>
        </div>
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
                  {child.nickname} - {child.grade || "未设置年级"}
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
                {!selectedChildId
                  ? "请先选择学习账户"
                  : stats?.totalToReview
                  ? `还有 ${stats.totalToReview} 道题目等待复习`
                  : "今日暂无需要复习的题目，继续保持！"}
              </p>
              {/* 优化：显示更多信息 */}
              {stats && !stats.totalToReview && (stats.wrong + stats.mastered > 0) && (
                <p className="text-xs text-green-600 mt-1">
                  🎉 太棒了！{stats.mastered} 道题已掌握，继续保持
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* 家长辅助复习 */}
              <Button
                size="lg"
                onClick={handleStartReview}
                disabled={!selectedChildId || !stats?.totalToReview || loading}
                className="gap-2"
                title={!stats?.totalToReview ? "暂没有需要复习的题目" : ""}
              >
                <Play className="h-5 w-5" />
                {loading ? "加载中..." : "开始复习"}
                <ChevronRight className="h-4 w-4" />
              </Button>
              {/* 推送给学生 */}
              <Button
                size="lg"
                variant="outline"
                onClick={handlePushToStudent}
                disabled={!selectedChildId || !stats?.totalToReview || pushing}
                className="gap-2"
                title={!stats?.totalToReview ? "暂没有需要复习的题目" : ""}
              >
                <Send className="h-5 w-5" />
                {pushing ? "推送中..." : "推送给学生"}
              </Button>
              {/* 查看全部错题 */}
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/dashboard/wrong-questions")}
                disabled={!selectedChildId || (stats && stats.wrong === 0 && stats.mastered === 0)}
                className="gap-2"
                title="查看所有易错题和已掌握题"
              >
                <List className="h-5 w-5" />
                查看全部错题
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center md:text-left">
            <span className="text-primary font-medium">开始复习</span>：家长和孩子一起在线做题 &nbsp;|&nbsp;
            <span className="text-primary font-medium">推送给学生</span>：发送复习任务，学生在学生端完成 &nbsp;|&nbsp;
            <span className="text-primary font-medium">查看全部错题</span>：管理所有易错题和已掌握题
          </p>
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
