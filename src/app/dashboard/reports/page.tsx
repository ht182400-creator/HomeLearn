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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  TrendingUp,
  Target,
  Clock,
  Trophy,
  Plus,
  FileText,
  ChevronRight,
  Calendar,
  CheckCircle2,
} from "lucide-react";

interface Child {
  id: string;
  name: string;
  grade: { name: string };
}

interface Report {
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
  createdAt: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("WEEKLY");
  const [summary, setSummary] = useState<{
    totalPractice: number;
    totalQuestions: number;
    avgAccuracy: number;
    totalTime: number;
    masteredCount: number;
  } | null>(null);

  // 加载孩子列表
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await fetch("/api/children");
        const data = await res.json();
        if (data.success) {
          setChildren(data.data);
          if (data.data.length > 0) {
            setSelectedChildId(data.data[0].id);
          }
        }
      } catch (error) {
        console.error("加载孩子列表失败:", error);
      }
    };
    fetchChildren();
  }, []);

  // 加载报告列表
  useEffect(() => {
    if (!selectedChildId) return;

    const fetchReports = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports?childId=${selectedChildId}&pageSize=20`);
        const data = await res.json();
        if (data.success) {
          setReports(data.data.reports);
        }
      } catch (error) {
        console.error("加载报告列表失败:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchSummary = async () => {
      try {
        // 获取本周统计数据
        const res = await fetch(
          `/api/reports?childId=${selectedChildId}&type=WEEKLY&pageSize=100`
        );
        const data = await res.json();
        if (data.success && data.data.reports.length > 0) {
          const reports = data.data.reports;
          const totalPractice = reports.length;
          const totalQuestions = reports.reduce(
            (sum: number, r: Report) => sum + r.totalQuestions,
            0
          );
          const totalCorrect = reports.reduce(
            (sum: number, r: Report) => sum + r.correctQuestions,
            0
          );
          const totalTime = reports.reduce(
            (sum: number, r: Report) => sum + (r.totalPracticeTime || 0),
            0
          );
          const masteredCount = reports.reduce(
            (sum: number, r: Report) => sum + (r.masteredQuestions || 0),
            0
          );

          setSummary({
            totalPractice,
            totalQuestions,
            avgAccuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
            totalTime,
            masteredCount,
          });
        }
      } catch (error) {
        console.error("加载统计摘要失败:", error);
      }
    };

    fetchReports();
    fetchSummary();
  }, [selectedChildId]);

  const handleGenerateReport = async () => {
    if (!selectedChildId) return;

    setGenerating(true);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: selectedChildId,
          type: reportType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // 刷新报告列表
        const reportsRes = await fetch(`/api/reports?childId=${selectedChildId}&pageSize=20`);
        const reportsData = await reportsRes.json();
        if (reportsData.success) {
          setReports(reportsData.data.reports);
        }
      }
    } catch (error) {
      console.error("生成报告失败:", error);
    } finally {
      setGenerating(false);
    }
  };

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      month: "short",
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          学习报告
        </h1>
        <p className="text-muted-foreground mt-2">
          追踪学习进度，分析薄弱环节
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

      {/* 统计概览 */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">本周练习</p>
                  <p className="text-3xl font-bold">{summary.totalPractice}</p>
                </div>
                <FileText className="h-10 w-10 text-blue-500/40" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">完成题目</p>
                  <p className="text-3xl font-bold">{summary.totalQuestions}</p>
                </div>
                <Target className="h-10 w-10 text-orange-500/40" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">正确率</p>
                  <p className="text-3xl font-bold text-green-600">{summary.avgAccuracy}%</p>
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
                  <p className="text-3xl font-bold">{formatTime(summary.totalTime)}</p>
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
                  <p className="text-3xl font-bold">{summary.masteredCount}</p>
                </div>
                <Trophy className="h-10 w-10 text-yellow-500/40" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 生成报告 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5" />
            生成报告
          </CardTitle>
          <CardDescription>选择报告类型，系统将自动统计学习数据</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label>报告类型</Label>
              <Select
                value={reportType}
                onValueChange={(v) => setReportType(v as typeof reportType)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">日报</SelectItem>
                  <SelectItem value="WEEKLY">周报</SelectItem>
                  <SelectItem value="MONTHLY">月报</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleGenerateReport}
                disabled={!selectedChildId || generating}
                className="gap-2"
              >
                {generating ? (
                  "生成中..."
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    生成报告
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 报告列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            历史报告
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无学习报告</p>
              <p className="text-sm">完成练习后即可生成学习报告</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>报告类型</TableHead>
                  <TableHead>时间范围</TableHead>
                  <TableHead className="text-center">练习次数</TableHead>
                  <TableHead className="text-center">正确率</TableHead>
                  <TableHead className="text-center">掌握</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-sm font-medium ${getTypeColor(
                          report.type
                        )}`}
                      >
                        {getTypeName(report.type)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(report.periodStart)} - {formatDate(report.periodEnd)}
                    </TableCell>
                    <TableCell className="text-center">{report.totalQuestions}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`font-medium ${
                          report.accuracyRate >= 80
                            ? "text-green-600"
                            : report.accuracyRate >= 60
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {report.accuracyRate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>{report.masteredQuestions}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => router.push(`/dashboard/reports/${report.id}`)}
                      >
                        查看
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
