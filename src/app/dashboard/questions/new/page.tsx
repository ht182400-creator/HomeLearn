import { Metadata } from "next";
import { QuestionForm } from "@/components/dashboard/question-form";

export const metadata: Metadata = {
  title: "新建题目 - HomeLearn",
  description: "创建新的练习题目",
};

export default function NewQuestionPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">新建题目</h1>
        <p className="text-gray-500 mt-1">
          创建新的练习题目，支持富文本编辑和公式输入
        </p>
      </div>

      <QuestionForm mode="create" />
    </div>
  );
}
