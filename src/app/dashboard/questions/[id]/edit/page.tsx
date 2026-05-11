import { Metadata } from "next";
import { notFound } from "next/navigation";
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

  // 获取题目数据
  const question = await prisma.question.findUnique({
    where: { id: params.id },
  });

  // 验证题目存在且属于当前用户
  if (!question || question.creatorId !== session?.user?.id) {
    notFound();
  }

  // 准备初始数据
  const initialData = {
    content: question.content,
    type: question.type,
    subjectId: question.subjectId,
    gradeId: question.gradeId,
    difficulty: question.difficulty,
    answer: question.answer,
    explanation: question.explanation || undefined,
    tags: question.tags || undefined,
    childId: question.childId || undefined,
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
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
