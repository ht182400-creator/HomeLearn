"use client";

/**
 * 举一反三变式题组件
 * @description 显示和管理变式题，包含生成、列表、详情功能
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Sparkles,
  Copy,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ChevronRight,
} from "lucide-react";

interface SimilarQuestion {
  id: string;
  content: any;
  answer: any;
  analysis: any;
  triggerType: string;
  status: string;
  modelUsed: string | null;
  createdAt: string;
}

interface SimilarQuestionsProps {
  questionId: string;
  childId: string;
  parentId: string;
  onGenerated?: () => void;
}

/**
 * 渲染内容 - 支持 HTML 字符串和 Tiptap JSON 格式
 */
function renderContent(content: any) {
  if (!content) return <p className="text-muted-foreground">暂无内容</p>;

  if (typeof content === "string") {
    return (
      <div
        className="prose prose-slate max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  if (content?.blocks) {
    return content.blocks.map((block: any, index: number) => {
      if (block.type === "paragraph") {
        return (
          <p key={index} className="mb-4 leading-relaxed">
            {block.content}
          </p>
        );
      }
      if (block.type === "bulletListItem") {
        return (
          <li key={index} className="ml-6 mb-1">
            {block.content}
          </li>
        );
      }
      return null;
    });
  }

  return <p>{String(content)}</p>;
}

/**
 * 获取状态徽章
 */
function getStatusBadge(status: string) {
  switch (status) {
    case "COMPLETED":
      return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />已完成</Badge>;
    case "GENERATING":
      return <Badge className="bg-yellow-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" />生成中</Badge>;
    case "FAILED":
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />失败</Badge>;
    case "PENDING":
      return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />待生成</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

/**
 * 举一反三生成器组件
 */
export function SimilarQuestionGenerator({
  questionId,
  childId,
  parentId,
  onGenerated,
}: SimilarQuestionsProps) {
  const { showToast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [count, setCount] = useState(3);

  /**
   * 生成变式题
   */
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          childId,
          count,
        }),
      });
      const data = await res.json();

      if (data.success) {
        showToast(`成功生成 ${data.questions?.length || 0} 道变式题！`, "success");
        onGenerated?.();
      } else {
        showToast(data.error || "生成失败", "error");
      }
    } catch (error) {
      console.error("生成变式题失败:", error);
      showToast("生成失败，请重试", "error");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <select
        value={count}
        onChange={(e) => setCount(Number(e.target.value))}
        className="px-3 py-2 border rounded-lg text-sm"
        disabled={generating}
      >
        <option value={1}>1 道</option>
        <option value={2}>2 道</option>
        <option value={3}>3 道</option>
        <option value={5}>5 道</option>
      </select>
      <Button
        onClick={handleGenerate}
        disabled={generating}
        className="gap-2"
      >
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            生成中...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            举一反三
          </>
        )}
      </Button>
    </div>
  );
}

/**
 * 变式题列表组件
 */
export function SimilarQuestionsList({
  questionId,
  childId,
  onRefresh,
}: {
  questionId: string;
  childId: string;
  onRefresh?: () => void;
}) {
  const { showToast } = useToast();
  const [questions, setQuestions] = useState<SimilarQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<SimilarQuestion | null>(null);

  /**
   * 加载变式题列表
   */
  useState(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ai/similar?questionId=${questionId}&childId=${childId}`);
        const data = await res.json();
        if (data.success) {
          setQuestions(data.questions || []);
        }
      } catch (error) {
        console.error("加载变式题失败:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  });

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-4">
        暂无变式题，点击上方按钮生成
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {questions.map((q, index) => (
          <Card
            key={q.id}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setSelectedQuestion(q)}
          >
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      变式题 {index + 1}
                    </Badge>
                    {getStatusBadge(q.status)}
                  </div>
                  <div className="text-sm text-gray-700 line-clamp-2">
                    {renderContent(q.content)}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 变式题详情弹窗 */}
      <SimilarQuestionDetailDialog
        question={selectedQuestion}
        open={!!selectedQuestion}
        onClose={() => setSelectedQuestion(null)}
      />
    </>
  );
}

/**
 * 变式题详情弹窗
 */
export function SimilarQuestionDetailDialog({
  question,
  open,
  onClose,
}: {
  question: SimilarQuestion | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!question) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            变式题详情
            {getStatusBadge(question.status)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 题目内容 */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Copy className="h-4 w-4" />
              变式题内容
            </h4>
            <div className="bg-slate-50 rounded-lg p-4">
              {renderContent(question.content)}
            </div>
          </div>

          {/* 答案 */}
          {question.answer && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                参考答案
              </h4>
              <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                {renderContent(question.answer)}
              </div>
            </div>
          )}

          {/* 解析 */}
          {question.analysis && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                解析
              </h4>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                {renderContent(question.analysis)}
              </div>
            </div>
          )}

          {/* 元信息 */}
          <div className="text-xs text-muted-foreground flex items-center gap-4 pt-4 border-t">
            {question.modelUsed && <span>模型: {question.modelUsed}</span>}
            <span>
              生成方式: {question.triggerType === "MANUAL" ? "手动" : question.triggerType === "AUTO" ? "自动" : "批量"}
            </span>
            <span>
              生成时间: {new Date(question.createdAt).toLocaleDateString("zh-CN")}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
