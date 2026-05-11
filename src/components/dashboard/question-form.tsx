"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichEditor } from "./rich-editor";
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
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
  const [showPreview, setShowPreview] = useState(false);

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

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const url = mode === "edit" && questionId
        ? `/api/questions/${questionId}`
        : "/api/questions";

      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "保存失败");
      }

      // 成功提示并跳转
      alert(mode === "edit" ? "题目更新成功！" : "题目创建成功！");
      router.push("/dashboard/questions");
      router.refresh();
    } catch (error: any) {
      alert(error.message || "保存失败，请重试");
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">题目内容</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? "编辑" : "预览"}
          </Button>
        </div>

        {errors.content && (
          <p className="text-sm text-red-500 mb-2">{errors.content}</p>
        )}

        {showPreview ? (
          <div className="min-h-[200px] p-4 bg-gray-50 rounded-lg border prose prose-sm max-w-none">
            {formData.content || <span className="text-gray-400">暂无内容</span>}
          </div>
        ) : (
          <RichEditor
            value={formData.content}
            onChange={(value) => updateField("content", value)}
            placeholder="请输入题目内容...
            
示例：
已知函数 f(x) = x² - 2ax + 3，当 x ∈ [1,3] 时，f(x) 的最小值为 2，求实数 a 的取值范围。"
          />
        )}
      </Card>

      {/* 答案 */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">
          答案 <span className="text-red-500">*</span>
        </h2>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="answer">参考答案</Label>
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              {answerHint}
            </span>
          </div>
          <textarea
            id="answer"
            value={formData.answer}
            onChange={(e) => updateField("answer", e.target.value)}
            placeholder={answerHint}
            rows={formData.type === "COMPREHENSIVE" || formData.type === "CALCULATION" ? 6 : 3}
            className={cn(
              "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y",
              errors.answer ? "border-red-500" : "border-gray-300"
            )}
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
          <textarea
            id="explanation"
            value={formData.explanation || ""}
            onChange={(e) => updateField("explanation", e.target.value)}
            placeholder="输入解题思路、关键步骤、涉及的知识点等..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
          <p className="text-xs text-gray-500">
            AI 可以根据解题思路生成更详细的讲解视频或互动式讲解
          </p>
        </div>
      </Card>

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
