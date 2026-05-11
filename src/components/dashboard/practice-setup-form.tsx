"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Child {
  id: string;
  name: string;
  grade?: { name: string } | null;
}

interface Subject {
  id: string;
  name: string;
  icon?: string;
}

interface PracticeSetupFormProps {
  children: Child[];
  subjects: Subject[];
}

type PracticeSource = "MANUAL" | "AI" | "WRONG_BOOK" | "REVIEW";

export function PracticeSetupForm({ children, subjects }: PracticeSetupFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    childId: "",
    subjectId: "",
    source: "MANUAL" as PracticeSource,
    questionCount: 10,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.childId) {
      setError("请选择孩子");
      return;
    }

    if (!formData.subjectId) {
      setError("请选择科目");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/practice/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "创建失败");
      }

      // 跳转到练习页面
      router.push(`/dashboard/practice/${data.session.id}?questions=${JSON.stringify(data.questions)}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "创建失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 选择孩子 */}
      <div className="space-y-2">
        <Label>
          选择孩子 <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {children.map((child) => (
            <button
              key={child.id}
              type="button"
              onClick={() => updateField("childId", child.id)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                formData.childId === child.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {child.name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium">{child.name}</div>
                  {child.grade && (
                    <div className="text-xs text-gray-500">{child.grade.name}</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
        {children.length === 0 && (
          <p className="text-sm text-gray-500">
            暂无孩子账户，请先{" "}
            <a href="/dashboard/children/new" className="text-blue-500 hover:underline">
              添加孩子
            </a>
          </p>
        )}
      </div>

      {/* 选择科目 */}
      <div className="space-y-2">
        <Label>
          选择科目 <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {subjects.map((subject) => (
            <button
              key={subject.id}
              type="button"
              onClick={() => updateField("subjectId", subject.id)}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                formData.subjectId === subject.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-2xl mb-1">{subject.icon || "📚"}</div>
              <div className="text-sm font-medium">{subject.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 练习来源 */}
      <div className="space-y-2">
        <Label>练习来源</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { value: "MANUAL", label: "随机练习", icon: "🎲", desc: "从题库随机抽取" },
            { value: "WRONG_BOOK", label: "错题本", icon: "📕", desc: "针对错题练习" },
            { value: "REVIEW", label: "复习模式", icon: "🔄", desc: "艾宾浩斯复习" },
            { value: "AI", label: "AI推荐", icon: "🤖", desc: "AI智能推荐" },
          ].map((source) => (
            <button
              key={source.value}
              type="button"
              onClick={() => updateField("source", source.value)}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                formData.source === source.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-2xl mb-1">{source.icon}</div>
              <div className="text-sm font-medium">{source.label}</div>
              <div className="text-xs text-gray-500">{source.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 题目数量 */}
      <div className="space-y-2">
        <Label>题目数量</Label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="5"
            max="30"
            value={formData.questionCount}
            onChange={(e) => updateField("questionCount", parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="w-16 text-center font-medium">{formData.questionCount} 题</span>
        </div>
      </div>

      {/* 提交按钮 */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={loading || !formData.childId || !formData.subjectId}
      >
        {loading ? "创建中..." : "开始练习"}
      </Button>
    </form>
  );
}
