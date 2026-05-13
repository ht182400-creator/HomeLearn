"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TiptapEditor } from "./tiptap-editor";
import { TiptapSimpleEditor } from "./tiptap-simple-editor";
import { useToast } from "@/components/ui/toast";
import {
  CreateQuestionSchema,
  QuestionTypeLabels,
  AnswerFormatHints,
  type QuestionType,
  type Difficulty,
  type CreateQuestionInput,
} from "@/lib/validators/question";
import { cn } from "@/lib/utils";

interface Subject {
  id: string;
  name: string;
  icon?: string;
}

interface Grade {
  id: string;
  name: string;
  level: number;
}

interface QuestionFormProps {
  initialData?: Partial<CreateQuestionInput>;
  mode?: "create" | "edit";
  questionId?: string;
}

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; color: string }[] = [
  { value: "EASY", label: "简单", color: "bg-green-100 text-green-700 border-green-300" },
  { value: "MEDIUM", label: "中等", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  { value: "HARD", label: "困难", color: "bg-red-100 text-red-700 border-red-300" },
];

export function QuestionForm({
  initialData,
  mode = "create",
  questionId,
}: QuestionFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<CreateQuestionInput>({
    content: initialData?.content || "",
    type: initialData?.type || "SINGLE_CHOICE",
    subjectId: initialData?.subjectId || "",
    gradeId: initialData?.gradeId || "",
    difficulty: initialData?.difficulty || "MEDIUM",
    answer: initialData?.answer || "",
    explanation: initialData?.explanation || "",
    tags: initialData?.tags || "",
    childId: initialData?.childId || "",
  });

  // 下拉选项数据
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);

  // 加载科目和年级数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [subjectsRes, gradesRes] = await Promise.all([
          fetch("/api/questions/subjects"),
          fetch("/api/questions/grades"),
        ]);

        if (subjectsRes.ok) {
          const data = await subjectsRes.json();
          setSubjects(data.subjects || []);
        }

        if (gradesRes.ok) {
          const data = await gradesRes.json();
          setGrades(data.grades || []);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 表单验证
  const validateForm = useCallback((): boolean => {
    // 检查题目内容是否为空（移除 HTML 标签后）
    const contentText = formData.content?.replace(/<[^>]*>/g, "").trim() || "";
    if (!contentText) {
      setErrors({ content: "题目内容不能为空" });
      return false;
    }

    // 检查答案是否为空
    const answerText = formData.answer?.replace(/<[^>]*>/g, "").trim() || "";
    if (!answerText) {
      setErrors({ answer: "答案不能为空" });
      return false;
    }

    try {
      CreateQuestionSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error: any) {
      const newErrors: Record<string, string> = {};
      error.errors?.forEach((err: any) => {
        const path = err.path.join(".");
        newErrors[path] = err.message;
      });
      setErrors(newErrors);
      return false;
    }
  }, [formData]);

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("=== 表单提交开始 ===");
    console.log("表单数据:", JSON.stringify(formData, null, 2));
    console.log("content HTML:", formData.content);
    console.log("content 长度:", formData.content?.length);

    // 检查 content 是否为空或只有空白标签
    const contentText = formData.content?.replace(/<[^>]*>/g, "").trim() || "";
    console.log("content 纯文本:", contentText, "长度:", contentText.length);

    if (!validateForm()) {
      console.log("前端验证失败:", errors);
      return;
    }

    setSubmitting(true);
    try {
      const url = mode === "edit" && questionId
        ? `/api/questions/${questionId}`
        : "/api/questions";

      const method = mode === "edit" ? "PUT" : "POST";

      console.log("发送请求到:", url, "方法:", method);

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      console.log("API 响应:", res.status, data);

      if (!res.ok) {
        throw new Error(data.error || data.details || "保存失败");
      }

      // 成功提示并跳转
      showToast(mode === "edit" ? "题目更新成功！" : "题目创建成功！", "success");
      router.push("/dashboard/questions");
      router.refresh();
    } catch (error: any) {
      console.error("提交错误:", error);
      setApiError(error.message || "保存失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  // 更新表单字段
  const updateField = <K extends keyof CreateQuestionInput>(
    field: K,
    value: CreateQuestionInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // 清除字段错误
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // 获取当前题目类型的答案提示
  const answerHint = AnswerFormatHints[formData.type];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* API 错误提示 */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">{apiError}</h3>
            {apiError.includes("登录") && (
              <p className="mt-1 text-sm text-red-600">
                请先{" "}
                <a href="/api/auth/signin" className="underline font-medium">
                  登录
                </a>{" "}
                后再试。
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setApiError(null)}
            className="flex-shrink-0 text-red-400 hover:text-red-600"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* 基本信息 */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">基本信息</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 科目 */}
          <div className="space-y-2">
            <Label htmlFor="subjectId">
              科目 <span className="text-red-500">*</span>
            </Label>
            <select
              id="subjectId"
              value={formData.subjectId}
              onChange={(e) => updateField("subjectId", e.target.value)}
              className={cn(
                "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
                errors.subjectId ? "border-red-500" : "border-gray-300"
              )}
              disabled={loading}
            >
              <option value="">请选择科目</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.icon && `${subject.icon} `}{subject.name}
                </option>
              ))}
            </select>
            {errors.subjectId && (
              <p className="text-sm text-red-500">{errors.subjectId}</p>
            )}
          </div>

          {/* 年级 */}
          <div className="space-y-2">
            <Label htmlFor="gradeId">
              年级 <span className="text-red-500">*</span>
            </Label>
            <select
              id="gradeId"
              value={formData.gradeId}
              onChange={(e) => updateField("gradeId", e.target.value)}
              className={cn(
                "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
                errors.gradeId ? "border-red-500" : "border-gray-300"
              )}
              disabled={loading}
            >
              <option value="">请选择年级</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name}
                </option>
              ))}
            </select>
            {errors.gradeId && (
              <p className="text-sm text-red-500">{errors.gradeId}</p>
            )}
          </div>

          {/* 题目类型 */}
          <div className="space-y-2">
            <Label htmlFor="type">
              题目类型 <span className="text-red-500">*</span>
            </Label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => updateField("type", e.target.value as QuestionType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(QuestionTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* 难度 */}
          <div className="space-y-2">
            <Label>难度</Label>
            <div className="flex gap-2">
              {DIFFICULTY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateField("difficulty", option.value)}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all",
                    formData.difficulty === option.value
                      ? `${option.color} border-2`
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 知识点标签 */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="tags">知识点标签</Label>
            <Input
              id="tags"
              value={formData.tags || ""}
              onChange={(e) => updateField("tags", e.target.value)}
              placeholder="多个标签用逗号分隔，如：一元二次方程, 判别式, 韦达定理"
            />
            <p className="text-xs text-gray-500">有助于后续按知识点筛选和智能推荐</p>
          </div>
        </div>
      </Card>

      {/* 题目内容 */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">题目内容</h2>

        {errors.content && (
          <p className="text-sm text-red-500 mb-2">{errors.content}</p>
        )}

        <TiptapEditor
          value={formData.content}
          onChange={(value) => updateField("content", value)}
          placeholder="请输入题目内容...

示例：
已知函数 f(x) = x² - 2ax + 3，当 x ∈ [1,3] 时，f(x) 的最小值为 2，求实数 a 的取值范围。"
        />
      </Card>

      {/* 答案 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            答案 <span className="text-red-500">*</span>
          </h2>
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            {answerHint}
          </span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="answer">参考答案</Label>
          <TiptapSimpleEditor
            value={formData.answer}
            onChange={(value) => updateField("answer", value)}
            placeholder={answerHint}
            rows={formData.type === "COMPREHENSIVE" || formData.type === "CALCULATION" ? 6 : 3}
            className={errors.answer ? "border-red-500" : ""}
          />
          {errors.answer && (
            <p className="text-sm text-red-500">{errors.answer}</p>
          )}
        </div>
      </Card>

      {/* 解析 */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">答案解析（可选）</h2>

        <div className="space-y-2">
          <Label htmlFor="explanation">解题思路</Label>
          <TiptapSimpleEditor
            value={formData.explanation || ""}
            onChange={(value) => updateField("explanation", value)}
            placeholder="输入解题思路、关键步骤、涉及的知识点等..."
            rows={4}
          />
          <p className="text-xs text-gray-500">
            AI 可以根据解题思路生成更详细的讲解视频或互动式讲解
          </p>
        </div>
      </Card>

      {/* 全局错误提示 */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-700 font-semibold mb-2">请完善以下信息：</h3>
          <ul className="list-disc list-inside text-red-600 text-sm">
            {Object.entries(errors).map(([field, message]) => (
              <li key={field}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 提交按钮 */}
      <div className="flex gap-4 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={submitting}
        >
          取消
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "保存中..." : mode === "edit" ? "更新题目" : "创建题目"}
        </Button>
      </div>
    </form>
  );
}
