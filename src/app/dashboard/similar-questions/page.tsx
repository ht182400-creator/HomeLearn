"use client";

/**
 * 举一反三变式题管理页面
 * @description 查看和管理孩子所有的变式题
 */
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Home,
  Search,
  Sparkles,
  Loader2,
  BookOpen,
  CheckCircle2,
  XCircle,
  Trash2,
  RefreshCw,
  Eye,
} from "lucide-react";

interface Child {
  id: string;
  nickname: string;
  grade: string;
}

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface SimilarQuestion {
  id: string;
  content: any;
  answer: any;
  analysis: any;
  triggerType: string;
  status: string;
  modelUsed: string | null;
  createdAt: string;
  originalQuestion: {
    id: string;
    content: any;
    subject: Subject;
  };
}

interface Stats {
  total: number;
  completed: number;
  pending: number;
}

export default function SimilarQuestionsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [questions, setQuestions] = useState<SimilarQuestion[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, pending: 0 });
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [viewingQuestion, setViewingQuestion] = useState<SimilarQuestion | null>(null);

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
        showToast("加载孩子列表失败", "error");
      }
    };
    fetchChildren();
  }, []);

  // 加载变式题列表
  useEffect(() => {
    if (!selectedChildId) return;

    const fetchQuestions = async () => {
      setLoadingStats(true);
      try {
        const params = new URLSearchParams({
          childId: selectedChildId,
        });
        if (selectedSubject && selectedSubject !== "all-subjects") {
          params.set("subjectId", selectedSubject);
        }

        const res = await fetch(`/api/ai/similar/list?${params}`);
        const data = await res.json();

        if (data.success) {
          setQuestions(data.questions || []);
          setSubjects(data.subjects || []);
          setStats(data.stats || { total: 0, completed: 0, pending: 0 });
        } else {
          showToast(data.error || "获取数据失败", "error");
        }
      } catch (error) {
        console.error("加载变式题列表失败:", error);
        showToast("获取数据失败", "error");
      } finally {
        setLoadingStats(false);
      }
    };

    const timer = setTimeout(() => {
      fetchQuestions();
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedChildId, selectedSubject, selectedChildId]);

  /**
   * 批量生成变式题
   */
  const handleBatchGenerate = async () => {
    if (selectedQuestions.size === 0) {
      showToast("请先选择要生成变式题的错题", "error");
      return;
    }

    setBatchGenerating(true);
    try {
      const res = await fetch("/api/ai/similar/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIds: Array.from(selectedQuestions),
          childId: selectedChildId,
        }),
      });
      const data = await res.json();

      if (data.success) {
        showToast(`成功提交 ${selectedQuestions.size} 道题的变式题生成任务！`, "success");
        setSelectedQuestions(new Set());
        // 刷新列表
        const refreshRes = await fetch(`/api/ai/similar/list?childId=${selectedChildId}`);
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setQuestions(refreshData.questions || []);
          setStats(refreshData.stats || { total: 0, completed: 0, pending: 0 });
        }
      } else {
        showToast(data.error || "生成失败", "error");
      }
    } catch (error) {
      console.error("批量生成失败:", error);
      showToast("批量生成失败，请重试", "error");
    } finally {
      setBatchGenerating(false);
    }
  };

  /**
   * 删除变式题
   */
  const handleDelete = async (questionId: string) => {
    if (!confirm("确定要删除这道变式题吗？")) return;

    try {
      const res = await fetch(`/api/ai/similar/${questionId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        showToast("删除成功", "success");
        setQuestions(questions.filter((q) => q.id !== questionId));
      } else {
        showToast(data.error || "删除失败", "error");
      }
    } catch (error) {
      console.error("删除失败:", error);
      showToast("删除失败，请重试", "error");
    }
  };

  /**
   * 切换题目选择
   */
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedQuestions);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedQuestions(newSet);
  };

  /**
   * 全选/取消全选
   */
  const toggleSelectAll = () => {
    if (selectedQuestions.size === questions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(questions.map((q) => q.id)));
    }
  };

  /**
   * 获取状态徽章
   */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />已完成</Badge>;
      case "GENERATING":
        return <Badge className="bg-yellow-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" />生成中</Badge>;
      case "FAILED":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />失败</Badge>;
      case "PENDING":
        return <Badge variant="outline"><RefreshCw className="h-3 w-3 mr-1" />待生成</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  /**
   * 渲染内容预览
   */
  const getContentPreview = (content: any) => {
    if (!content) return "题目内容";
    if (typeof content === "string") {
      return content.replace(/<[^>]*>/g, "").trim().slice(0, 60);
    }
    if (content?.blocks) {
      return content.blocks
        .filter((b: any) => b.type === "paragraph")
        .map((b: any) => b.content)
        .join(" ")
        .slice(0, 60);
    }
    return "题目内容";
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
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
          <Sparkles className="h-8 w-8 text-primary" />
          举一反三
        </h1>
        <p className="text-muted-foreground mt-2">
          基于错题生成变式题，举一反三，巩固知识点
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

      {/* 统计卡片 */}
      {loadingStats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-24" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">总变式题</p>
                  <p className="text-3xl font-bold text-primary">{stats.total}</p>
                </div>
                <Sparkles className="h-10 w-10 text-primary/40" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已完成</p>
                  <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircle2 className="h-10 w-10 text-green-500/40" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">待生成</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <RefreshCw className="h-10 w-10 text-yellow-500/40" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 筛选 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索变式题内容..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="选择学科" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-subjects">全部学科</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={() => router.push("/dashboard/wrong-questions")}
              variant="outline"
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              去错题库批量生成
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 变式题列表 */}
      {loadingStats ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : questions.length === 0 ? (
        <Card className="py-12 text-center">
          <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">
            暂无变式题
          </h3>
          <p className="text-muted-foreground mb-4">
            去错题库选择题目，生成举一反三变式题
          </p>
          <Button onClick={() => router.push("/dashboard/wrong-questions")}>
            <BookOpen className="h-4 w-4 mr-2" />
            去错题库
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <Card
              key={q.id}
              className={`bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow ${
                q.status === "COMPLETED" ? "border-green-200" : "border-yellow-200"
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {/* 左侧：内容区域 */}
                  <div className="flex-1 min-w-0">
                    {/* 标签行 */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          backgroundColor: (q.originalQuestion?.subject?.color || "#666") + "20",
                          color: q.originalQuestion?.subject?.color || "#666",
                        }}
                      >
                        {q.originalQuestion?.subject?.name || "未知学科"}
                      </span>
                      {getStatusBadge(q.status)}
                      <Badge variant="outline" className="text-xs">
                        {q.triggerType === "MANUAL" ? "手动" : q.triggerType === "AUTO" ? "自动" : "批量"}
                      </Badge>
                      {q.modelUsed && (
                        <span className="text-xs text-muted-foreground">
                          {q.modelUsed}
                        </span>
                      )}
                    </div>

                    {/* 变式题内容预览 */}
                    <p className="text-base text-gray-700">
                      {getContentPreview(q.content)}
                      {getContentPreview(q.content).length >= 60 && "..."}
                    </p>

                    {/* 原题信息 */}
                    <p className="text-xs text-muted-foreground mt-2">
                      基于: {getContentPreview(q.originalQuestion?.content)}
                    </p>
                  </div>

                  {/* 右侧：操作按钮 */}
                  <div className="flex-shrink-0 flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewingQuestion(q)}
                      className="h-10 w-10"
                    >
                      <Eye className="h-5 w-5 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(q.id)}
                      className="h-10 w-10"
                    >
                      <Trash2 className="h-5 w-5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 变式题详情弹窗 */}
      {viewingQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                变式题详情
              </h3>
              {getStatusBadge(viewingQuestion.status)}
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)] space-y-6">
              {/* 题目内容 */}
              <div>
                <h4 className="font-medium mb-2">变式题内容</h4>
                <div className="bg-slate-50 rounded-lg p-4">
                  {typeof viewingQuestion.content === "string" ? (
                    <div dangerouslySetInnerHTML={{ __html: viewingQuestion.content }} />
                  ) : (
                    <p>{JSON.stringify(viewingQuestion.content)}</p>
                  )}
                </div>
              </div>

              {/* 答案 */}
              {viewingQuestion.answer && (
                <div>
                  <h4 className="font-medium mb-2">参考答案</h4>
                  <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                    {typeof viewingQuestion.answer === "string" ? (
                      <div dangerouslySetInnerHTML={{ __html: viewingQuestion.answer }} />
                    ) : (
                      <p>{JSON.stringify(viewingQuestion.answer)}</p>
                    )}
                  </div>
                </div>
              )}

              {/* 解析 */}
              {viewingQuestion.analysis && (
                <div>
                  <h4 className="font-medium mb-2">解析</h4>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    {typeof viewingQuestion.analysis === "string" ? (
                      <div dangerouslySetInnerHTML={{ __html: viewingQuestion.analysis }} />
                    ) : (
                      <p>{JSON.stringify(viewingQuestion.analysis)}</p>
                    )}
                  </div>
                </div>
              )}

              {/* 原题 */}
              <div>
                <h4 className="font-medium mb-2">原题</h4>
                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  {typeof viewingQuestion.originalQuestion?.content === "string" ? (
                    <div dangerouslySetInnerHTML={{ __html: viewingQuestion.originalQuestion?.content }} />
                  ) : (
                    <p>{JSON.stringify(viewingQuestion.originalQuestion?.content)}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
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
