import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit2, Calendar, BookOpen, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { QUESTION_TYPE_LABELS, getDifficultyLabel, getDifficultyColor } from "@/lib/utils";

interface PageProps {
  params: { id: string };
}

export const metadata: Metadata = {
  title: "题目详情 - HomeLearn",
  description: "查看题目详情",
};

export default async function QuestionDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  // 获取题目数据
  const question = await prisma.question.findUnique({
    where: { id: params.id },
    include: {
      subject: true,
    },
  });

  // 验证题目存在且属于当前用户
  if (!question || question.userId !== session?.user?.id) {
    notFound();
  }

  /**
   * 渲染内容 - 支持 HTML 字符串和 Tiptap JSON 格式
   */
  const renderContent = (content: any) => {
    // 处理空值
    if (!content) return <p className="text-muted-foreground">暂无内容</p>;

    // 如果是字符串（HTML），直接渲染
    if (typeof content === "string") {
      return (
        <div
          className="prose prose-slate max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }

    // 如果是 Tiptap JSON 格式（有 blocks 属性）
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

    // 其他情况，尝试直接显示
    return <p>{String(content)}</p>;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/questions">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold">题目详情</h1>
            </div>
            <Link href={`/dashboard/questions/${params.id}/edit`}>
              <Button>
                <Edit2 className="h-4 w-4 mr-2" />
                编辑题目
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 基本信息 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="text-sm px-3 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: question.subject.color + "20",
                  color: question.subject.color,
                }}
              >
                {question.subject.name}
              </span>
              <span className="text-sm text-muted-foreground">
                {QUESTION_TYPE_LABELS[question.type]}
              </span>
              <span
                className={`text-sm px-2 py-0.5 rounded ${getDifficultyColor(question.difficulty)}`}
              >
                {getDifficultyLabel(question.difficulty)}
              </span>
              {question.tags && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Tag className="h-3 w-3" />
                  {question.tags}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              创建于 {formatDate(question.createdAt)}
            </div>
          </CardContent>
        </Card>

        {/* 题目内容 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              题目内容
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-slate max-w-none">
              {renderContent(question.content)}
            </div>
          </CardContent>
        </Card>

        {/* 答案 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">参考答案</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 border border-green-100 rounded-lg p-4">
              <div className="prose prose-slate max-w-none">
                {renderContent(question.answer)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 解析 */}
        {question.analysis && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">答案解析</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="prose prose-slate max-w-none">
                  {renderContent(question.analysis)}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
