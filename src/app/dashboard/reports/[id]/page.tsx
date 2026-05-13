"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  TrendingUp,
  Target,
  Clock,
  Trophy,
  CheckCircle2,
  ArrowLeft,
  Home,
  FileText,
  BookOpen,
  Calendar,
} from "lucide-react";

interface ReportDetail {
  id: string;
  type: "DAILY" | "WEEKLY" | "MONTHLY";
  periodStart: string;
  periodEnd: string;
  totalQuestions: number;
  correctQuestions: number;
  accuracyRate: number;
  totalPracticeTime: number;
  masteredQuestions: number;
  reviewedQuestions: number;
  summary: string;
  subjectBreakdown: Array<{
    subject: string;
    total: number;
    correct: number;
    accuracy: number;
  }>;
  createdAt: string;
  child: {
    id: string;
    nickname: string;
    grade: string;
  };
}

export default function ReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/reports/${params.id}`);
        const data = await res.json();
        if (data.success) {
          setReport(data.data);
        }
      } catch (error) {
        console.error("加载报告详情失败:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchReport();
    }
  }, [params.id]);

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      DAILY: "日报",
      WEEKLY: "周报",
      MONTHLY: "月报",
    };
    return typeMap[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      DAILY: "bg-blue-100 text-blue-700",
      WEEKLY: "bg-green-100 text-green-700",
      MONTHLY: "bg-purple-100 text-purple-700",
    };
    return colorMap[type] || "";
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="text-center py-20">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">报告不存在</h2>
          <p className="text-muted-foreground mb-6">该学习报告已被删除或不存在</p>
          <Button onClick={() => router.push("/dashboard/reports")}>
            返回报告列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* 页面标题 */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/reports")} className="gap-1">
            <Home className="h-4 w-4" />
            返回报告列表
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{getTypeName(report.type)}详情</h1>
            <p className="text-muted-foreground mt-1">
              {report.child.nickname} - {report.child.grade || "未设置年级"}
            </p>
          </div>
        </div>
      </div>

      {/* 时间范围 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-5 w-5" />
            <span>
              时间范围：{formatDate(report.periodStart)} - {formatDate(report.periodEnd)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">完成题目</p>
                <p className="text-3xl font-bold">{report.totalQuestions}</p>
              </div>
              <Target className="h-10 w-10 text-orange-500/40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">正确题目</p>
                <p className="text-3xl font-bold text-green-600">{report.correctQuestions}</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-500/40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">正确率</p>
                <p className="text-3xl font-bold text-green-600">{report.accuracyRate}%</p>
              </div>
              <TrendingUp className="h-10 w-10 text-green-500/40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">学习时长</p>
                <p className="text-3xl font-bold">{formatTime(report.totalPracticeTime)}</p>
              </div>
              <Clock className="h-10 w-10 text-purple-500/40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">掌握题目</p>
                <p className="text-3xl font-bold">{report.masteredQuestions}</p>
              </div>
              <Trophy className="h-10 w-10 text-yellow-500/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 科目分布 */}
      {report.subjectBreakdown && report.subjectBreakdown.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              科目分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.subjectBreakdown.map((subject, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-24 font-medium">{subject.subject}</div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${subject.accuracy}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-right text-sm text-muted-foreground">
                    {subject.correct}/{subject.total}
                  </div>
                  <div className="w-16 text-right font-medium">
                    {subject.accuracy}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 报告摘要 */}
      {report.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              报告摘要
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{report.summary}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
