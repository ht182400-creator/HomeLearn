import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionForm } from "@/components/dashboard/question-form";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface PageProps {
  params: { id: string };
}

export const metadata: Metadata = {
  title: "编辑题目 - HomeLearn",
  description: "编辑练习题目",
};

export default async function EditQuestionPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  // 获取题目数据（包含标签关联）
  const question = await prisma.question.findUnique({
    where: { id: params.id },
    include: {
      questionTags: {
        include: { tag: true },
      },
    },
  });

  // 验证题目存在且属于当前用户
  if (!question || question.userId !== session?.user?.id) {
    notFound();
  }

  // 准备初始数据
  // 注意：explanation 是表单字段名，数据库中是 analysis
  // DB 中 difficulty 是 Int 1-5，需转为表单的 Difficulty 枚举
  const difficultyMap: Record<number, string> = {
    1: "EASY",
    2: "MEDIUM",
    3: "MEDIUM",
    4: "HARD",
    5: "HARD",
  };
  const difficultyValue = question.difficulty
    ? (difficultyMap[question.difficulty] || "MEDIUM")
    : "MEDIUM";

  // DB 字段 content/answer/analysis 是 Json 类型，需要转为 string 给表单
  // 注意：analysis 可能被存储为 { text: "..." } 格式，需提取 .text
  const contentStr = typeof question.content === "string"
    ? question.content
    : JSON.stringify(question.content);
  const answerStr = typeof question.answer === "string"
    ? question.answer
    : JSON.stringify(question.answer);
  const analysisRaw = question.analysis;
  let analysisStr = "";
  if (analysisRaw) {
    // 兼容两种格式：直接字符串 或 { text: "..." } 对象
    if (typeof analysisRaw === "string") {
      analysisStr = analysisRaw;
    } else if (typeof analysisRaw === "object" && analysisRaw !== null && "text" in analysisRaw) {
      analysisStr = (analysisRaw as any).text || "";
    } else {
      analysisStr = JSON.stringify(analysisRaw);
    }
  }

  // 从关联表获取标签名称，拼接为逗号分隔的字符串
  const tagsStr = question.questionTags && question.questionTags.length > 0
    ? question.questionTags.map(qt => qt.tag.name).join(", ")
    : "";

  const initialData = {
    content: contentStr,
    type: question.type,
    subjectId: question.subjectId,
    gradeId: question.grade || undefined,
    difficulty: difficultyValue as "EASY" | "MEDIUM" | "HARD",
    answer: answerStr,
    explanation: analysisStr,
    tags: tagsStr,
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* 返回导航 */}
      <div className="mb-6">
        <Link href="/dashboard/questions">
          <Button variant="ghost" size="sm" className="pl-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回题库
          </Button>
        </Link>
      </div>
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">编辑题目</h1>
        <p className="text-gray-500 mt-1">
          修改题目内容、答案及相关信息
        </p>
      </div>

      <QuestionForm
        mode="edit"
        questionId={params.id}
        initialData={initialData}
      />
    </div>
  );
}
