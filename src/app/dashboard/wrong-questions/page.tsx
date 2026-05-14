"use client";

/**
 * 家长端错题库管理页面
 * @description 家长查看和管理孩子的所有错题，支持筛选、搜索、推送复习
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
  Eye,
  Brain,
  Trophy,
  Target,
  Send,
  Loader2,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Sparkles,
  Check,
  Square,
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

interface Question {
  id: string;
  mastered: boolean;
  masteryLevel: number;
  attempts: number;
  lastAttempt: string | null;
  wrongAnswer: any;
  wrongType: string | null;
  question: {
    id: string;
    type: string;
    difficulty: number;
    content: any;
    answer: any;
    analysis: any;
    subject: Subject;
  };
}

interface Stats {
  total: number;
  mastered: number;
  wrong: number;
}

export default function WrongQuestionsManagementPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, mastered: 0, wrong: 0 });
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [viewingQuestion, setViewingQuestion] = useState<Question | null>(null);
  const [pushing, setPushing] = useState(false);
  const [selectedForSimilar, setSelectedForSimilar] = useState<Set<string>>(new Set());
  const [generatingSimilar, setGeneratingSimilar] = useState(false);
  // 批量生成进度追踪
  const [similarProgress, setSimilarProgress] = useState({ current: 0, total: 0 });

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

  // 加载错题列表
  useEffect(() => {
    if (!selectedChildId) return;

    const fetchQuestions = async () => {
      setLoadingStats(true);
      try {
        const params = new URLSearchParams({
          childId: selectedChildId,
          type: selectedType,
        });
        if (selectedSubject && selectedSubject !== "all-subjects") {
          params.set("subjectId", selectedSubject);
        }
        if (search) {
          params.set("search", search);
        }

        const res = await fetch(`/api/dashboard/wrong-questions?${params}`);
        const data = await res.json();

        if (data.success) {
          setQuestions(data.questions || []);
          setSubjects(data.subjects || []);
          setStats(data.stats || { total: 0, mastered: 0, wrong: 0 });
        } else {
          showToast(data.error || "获取数据失败", "error");
        }
      } catch (error) {
        console.error("加载错题列表失败:", error);
        showToast("获取数据失败", "error");
      } finally {
        setLoadingStats(false);
      }
    };

    // 防抖处理
    const timer = setTimeout(() => {
      fetchQuestions();
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedChildId, selectedType, selectedSubject, search]);

  // 推送给学生
  const handlePushToStudent = async (questionId?: string) => {
    if (!selectedChildId) {
      showToast("请先选择孩子账户", "error");
      return;
    }

    setPushing(true);
    try {
      const res = await fetch("/api/review/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: selectedChildId,
          taskType: "REVIEW",
          questionId, // 如果指定了题目ID，只推送这一道
          description: questionId
            ? "单题复习任务"
            : `复习任务：${questions.filter((q) => !q.mastered).length} 道易错题待复习`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("已成功推送给学生！", "success");
      } else {
        showToast(data.error || "推送失败", "error");
      }
    } catch (error) {
      console.error("推送失败:", error);
      showToast("推送失败，请重试", "error");
    } finally {
      setPushing(false);
    }
  };

  /**
   * 批量生成变式题（带进度反馈）
   */
  const handleBatchGenerateSimilar = async () => {
    if (selectedForSimilar.size === 0) {
      showToast("请先选择要生成变式题的错题", "error");
      return;
    }

    if (!selectedChildId) {
      showToast("请先选择孩子账户", "error");
      return;
    }

    setGeneratingSimilar(true);
    const total = selectedForSimilar.size;
    setSimilarProgress({ current: 0, total });
    try {
      // 使用 EventSource 或轮询获取进度
      const res = await fetch("/api/ai/similar/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIds: Array.from(selectedForSimilar),
          childId: selectedChildId,
        }),
      });

      // 模拟进度更新（实际 API 是同步的，但生成过程耗时较长）
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress = Math.min(progress + 1, total - 1);
        setSimilarProgress(prev => ({ ...prev, current: progress + 1 }));
      }, 3000); // 每3秒模拟一道题完成

      const data = await res.json();
      clearInterval(progressInterval);
      setSimilarProgress({ current: total, total });

      if (data.success) {
        const successCount = data.data?.success || 0;
        const failCount = data.data?.failed || 0;
        if (failCount > 0) {
          showToast(`成功 ${successCount} 道，失败 ${failCount} 道`, "warning");
        } else {
          showToast(`成功提交 ${successCount} 道题的变式题生成任务！`, "success");
        }
        setSelectedForSimilar(new Set());
      } else {
        showToast(data.error || "生成失败", "error");
      }
    } catch (error) {
      console.error("批量生成变式题失败:", error);
      showToast("批量生成失败，请重试", "error");
    } finally {
      setTimeout(() => {
        setGeneratingSimilar(false);
        setSimilarProgress({ current: 0, total: 0 });
      }, 1500); // 延迟重置，让用户看到完成状态
    }
  };

  /**
   * 单题生成变式题
   */
  const handleGenerateSimilar = async (questionId: string) => {
    if (!selectedChildId) {
      showToast("请先选择孩子账户", "error");
      return;
    }

    setGeneratingSimilar(true);
    try {
      const res = await fetch("/api/ai/similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          childId: selectedChildId,
          count: 3,
        }),
      });
      const data = await res.json();

      if (data.success) {
        showToast(`成功生成 ${data.questions?.length || 0} 道变式题！`, "success");
      } else {
        showToast(data.error || "生成失败", "error");
      }
    } catch (error) {
      console.error("生成变式题失败:", error);
      showToast("生成失败，请重试", "error");
    } finally {
      setGeneratingSimilar(false);
    }
  };

  /**
   * 切换变式题选择
   */
  const toggleSimilarSelect = (questionId: string) => {
    const newSet = new Set(selectedForSimilar);
    if (newSet.has(questionId)) {
      newSet.delete(questionId);
    } else {
      newSet.add(questionId);
    }
    setSelectedForSimilar(newSet);
  };

  /**
   * 全选/取消全选（未掌握的题目）
   */
  const toggleSelectAllUnmastered = () => {
    const unmasteredIds = questions.filter((q) => !q.mastered).map((q) => q.question.id);
    if (selectedForSimilar.size === unmasteredIds.length) {
      setSelectedForSimilar(new Set());
    } else {
      setSelectedForSimilar(new Set(unmasteredIds));
    }
  };

  // 获取内容预览
  const getContentPreview = (content: any) => {
    if (!content) return "题目内容";
    if (typeof content === "string") {
      return content.replace(/<[^>]*>/g, "").trim().slice(0, 80);
    }
    if (content?.blocks) {
      return content.blocks
        .filter((b: any) => b.type === "paragraph")
        .map((b: any) => b.content)
        .join(" ")
        .slice(0, 80);
    }
    return "题目内容";
  };

  // 获取难度标签
  const getDifficultyBadge = (difficulty: number) => {
    if (difficulty >= 4) return <Badge variant="destructive">困难</Badge>;
    if (difficulty >= 3) return <Badge className="bg-yellow-500">中等</Badge>;
    return <Badge className="bg-green-500">简单</Badge>;
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
          <Brain className="h-8 w-8 text-primary" />
          错题库管理
        </h1>
        <p className="text-muted-foreground mt-2">
          查看和管理孩子的所有易错题和已掌握题
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
                  <p className="text-sm text-muted-foreground">总题目数</p>
                  <p className="text-3xl font-bold text-primary">{stats.total}</p>
                </div>
                <Target className="h-10 w-10 text-primary/40" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">易错题</p>
                  <p className="text-3xl font-bold text-red-600">{stats.wrong}</p>
                </div>
                <Brain className="h-10 w-10 text-red-500/40" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已掌握</p>
                  <p className="text-3xl font-bold text-green-600">{stats.mastered}</p>
                </div>
                <Trophy className="h-10 w-10 text-green-500/40" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 筛选和搜索 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索题目内容..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="题目类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部题目</SelectItem>
                <SelectItem value="wrong">易错题</SelectItem>
                <SelectItem value="mastered">已掌握</SelectItem>
              </SelectContent>
            </Select>

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

            {questions.filter((q) => !q.mastered).length > 0 && (
              <Button
                onClick={() => handlePushToStudent()}
                disabled={pushing}
                className="gap-2"
              >
                {pushing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                推送易错题
              </Button>
            )}

            {/* 举一反三相关操作 */}
            <div className="flex items-center gap-2 ml-auto">
              {selectedForSimilar.size > 0 && (
                <Button
                  onClick={handleBatchGenerateSimilar}
                  disabled={generatingSimilar}
                  className="gap-2 bg-purple-600 hover:bg-purple-700 relative overflow-hidden"
                >
                  {generatingSimilar ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      生成中 ({similarProgress.current}/{similarProgress.total})
                      {/* 进度条 */}
                      <div
                        className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-500"
                        style={{ width: `${(similarProgress.current / similarProgress.total) * 100}%` }}
                      />
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      生成 {selectedForSimilar.size} 道变式题
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={toggleSelectAllUnmastered}
                className="gap-2"
              >
                {selectedForSimilar.size === questions.filter((q) => !q.mastered).length ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                全选错题
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/similar-questions")}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                查看变式题
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 题目列表 */}
      {loadingStats ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : questions.length === 0 ? (
        <Card className="py-12 text-center">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">
            {stats.total === 0 ? "太棒了！暂无错题记录" : "没有找到匹配的题目"}
          </h3>
          <p className="text-muted-foreground">
            {stats.total === 0
              ? "继续保持！完成更多练习来巩固知识"
              : "尝试调整筛选条件"}
          </p>
          {stats.total === 0 && (
            <Button className="mt-4" onClick={() => router.push("/dashboard/questions")}>
              去题库添加题目
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((wq) => (
            <Card
              key={wq.id}
              className={`bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow ${
                wq.mastered ? "border-green-200" : "border-red-200"
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {/* 选择框（仅未掌握的题目） */}
                  {!wq.mastered && (
                    <button
                      onClick={() => toggleSimilarSelect(wq.question.id)}
                      className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedForSimilar.has(wq.question.id)
                          ? "bg-purple-600 border-purple-600"
                          : "border-gray-300 hover:border-purple-400"
                      }`}
                    >
                      {selectedForSimilar.has(wq.question.id) && (
                        <Check className="h-4 w-4 text-white" />
                      )}
                    </button>
                  )}

                  {/* 左侧：内容区域 */}
                  <div className="flex-1 min-w-0">
                    {/* 标签行 */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          backgroundColor: wq.question.subject.color + "20",
                          color: wq.question.subject.color,
                        }}
                      >
                        {wq.question.subject.name}
                      </span>
                      {wq.mastered ? (
                        <Badge className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          已掌握
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          <XCircle className="h-3 w-3 mr-1" />
                          易错
                        </Badge>
                      )}
                      {getDifficultyBadge(wq.question.difficulty)}
                      <span className="text-xs text-muted-foreground">
                        错误 {wq.attempts} 次
                      </span>
                    </div>

                    {/* 题目内容预览 */}
                    <p className="text-base text-gray-700">
                      {getContentPreview(wq.question.content)}
                      {getContentPreview(wq.question.content).length >= 80 && "..."}
                    </p>

                    {/* 元信息 */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        最后一次:{" "}
                        {wq.lastAttempt
                          ? new Date(wq.lastAttempt).toLocaleDateString("zh-CN")
                          : "暂无"}
                      </span>
                      <span>掌握程度: {wq.masteryLevel}/5</span>
                    </div>
                  </div>

                  {/* 右侧：操作按钮 */}
                  <div className="flex-shrink-0 flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewingQuestion(wq)}
                      className="h-10 w-10"
                    >
                      <Eye className="h-5 w-5 text-blue-500" />
                    </Button>
                    {!wq.mastered && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleGenerateSimilar(wq.question.id)}
                          disabled={generatingSimilar}
                          className="h-10 w-10"
                          title="生成举一反三变式题"
                        >
                          <Sparkles className="h-5 w-5 text-purple-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePushToStudent(wq.question.id)}
                          disabled={pushing}
                          className="h-10 w-10"
                          title="推送这道题复习"
                        >
                          <Send className="h-5 w-5 text-green-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 题目详情弹窗 */}
      {viewingQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* 弹窗头部 */}
            <div
              className={`flex items-center justify-between p-4 border-b ${
                viewingQuestion.mastered ? "bg-green-50" : "bg-red-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    viewingQuestion.mastered ? "bg-green-500" : "bg-red-500"
                  }`}
                >
                  {viewingQuestion.mastered ? (
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  ) : (
                    <XCircle className="h-5 w-5 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {viewingQuestion.mastered ? "已掌握题目" : "易错题目"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    错误次数: {viewingQuestion.attempts} | 掌握程度:{" "}
                    {viewingQuestion.masteryLevel}/5
                  </p>
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
                  style={{
                    backgroundColor: viewingQuestion.question.subject.color + "20",
                    color: viewingQuestion.question.subject.color,
                  }}
                >
                  {viewingQuestion.question.subject.name}
                </span>
                {getDifficultyBadge(viewingQuestion.question.difficulty)}
                {viewingQuestion.wrongType && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    {viewingQuestion.wrongType}
                  </Badge>
                )}
              </div>

              {/* 题目内容 */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">题目内容</h4>
                <div
                  className="p-4 bg-gray-50 rounded-lg text-base"
                  dangerouslySetInnerHTML={{
                    __html:
                      typeof viewingQuestion.question.content === "string"
                        ? viewingQuestion.question.content
                        : "<p>" +
                          (viewingQuestion.question.content?.blocks
                            ?.map((b: any) => b.content)
                            .join("") ||
                            "") +
                          "</p>",
                  }}
                />
              </div>

              {/* 错误答案（如果有） */}
              {!viewingQuestion.mastered && viewingQuestion.wrongAnswer && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-red-600 mb-2 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    错误答案
                  </h4>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 prose max-w-none">
                    {viewingQuestion.wrongAnswer?.answer
                      ? String(viewingQuestion.wrongAnswer.answer)
                      : "无记录"}
                  </div>
                </div>
              )}

              {/* 正确答案 */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-green-600 mb-2 flex items-center gap-2">
                  ✓ 正确答案
                </h4>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg prose max-w-none">
                  {typeof viewingQuestion.question.answer === "string" ? (
                    <div dangerouslySetInnerHTML={{ __html: viewingQuestion.question.answer }} />
                  ) : (
                    <pre className="text-sm">{JSON.stringify(viewingQuestion.question.answer, null, 2)}</pre>
                  )}
                </div>
              </div>

              {/* 题目解析 */}
              {viewingQuestion.question.analysis && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-blue-600 mb-2 flex items-center gap-2">
                    💡 题目解析
                  </h4>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg prose max-w-none">
                    {typeof viewingQuestion.question.analysis === "string" ? (
                      <div dangerouslySetInnerHTML={{ __html: viewingQuestion.question.analysis }} />
                    ) : (
                      <p>{viewingQuestion.question.analysis?.text || "暂无解析"}</p>
                    )}
                  </div>
                </div>
              )}

              {/* 复习统计 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-xs text-orange-600 mb-1">错误次数</p>
                  <p className="text-xl font-bold text-orange-700">
                    {viewingQuestion.attempts}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-600 mb-1">掌握程度</p>
                  <p className="text-xl font-bold text-purple-700">
                    {viewingQuestion.masteryLevel}/5
                  </p>
                </div>
              </div>
            </div>

            {/* 弹窗底部 */}
            <div className="p-4 border-t bg-gray-50 flex justify-between gap-2">
              {!viewingQuestion.mastered && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      handlePushToStudent(viewingQuestion.question.id);
                      setViewingQuestion(null);
                    }}
                    disabled={pushing}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    推送复习
                  </Button>
                  <Button
                    onClick={() => {
                      handleGenerateSimilar(viewingQuestion.question.id);
                      setViewingQuestion(null);
                    }}
                    disabled={generatingSimilar}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {generatingSimilar ? "生成中..." : "生成变式题"}
                  </Button>
                </div>
              )}
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
