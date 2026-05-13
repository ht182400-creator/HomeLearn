import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionForm } from "@/components/dashboard/question-form";

export const metadata: Metadata = {
  title: "新建题目 - HomeLearn",
  description: "创建新的练习题目",
};

export default function NewQuestionPage() {
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
        <h1 className="text-2xl font-bold text-gray-900">新建题目</h1>
        <p className="text-gray-500 mt-1">
          创建新的练习题目，支持富文本编辑和公式输入
        </p>
      </div>

      <QuestionForm mode="create" />
    </div>
  );
}
