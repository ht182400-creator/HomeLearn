"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  Plus,
  Clock,
  ChevronRight,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/lib/stores/auth-store";

interface ChatSession {
  id: string;
  subject?: string;
  summary: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}

export default function ChatPage() {
  const router = useRouter();
  const { user, children } = useAuthStore();
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // 设置默认孩子
  useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  // 加载会话列表
  useEffect(() => {
    if (selectedChild) {
      loadSessions();
    }
  }, [selectedChild]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/sessions?childId=${selectedChild}`);
      const data = await res.json();
      if (data.success) {
        setSessions(data.data);
      }
    } catch (error) {
      console.error("加载会话失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (subject?: string) => {
    if (!selectedChild) return;

    setCreating(true);
    try {
      const res = await fetch("/api/ai/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: selectedChild, subject }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/dashboard/chat/${data.data.id}`);
      }
    } catch (error) {
      console.error("创建会话失败:", error);
    } finally {
      setCreating(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString("zh-CN");
  };

  const subjects = [
    { value: "math", label: "数学辅导", icon: "📐", color: "bg-blue-100 text-blue-700" },
    { value: "english", label: "英语学习", icon: "📖", color: "bg-green-100 text-green-700" },
    { value: "chinese", label: "语文答疑", icon: "📚", color: "bg-amber-100 text-amber-700" },
    { value: "general", label: "综合问答", icon: "💡", color: "bg-purple-100 text-purple-700" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-purple-500" />
              AI 学习助手
            </h1>
            <p className="text-gray-600 mt-1">随时随地，有问必答</p>
          </div>

          {/* 孩子选择 */}
          <Select value={selectedChild} onValueChange={setSelectedChild}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="选择孩子" />
            </SelectTrigger>
            <SelectContent>
              {children.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 快速开始 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {subjects.map((subject) => (
            <button
              key={subject.value}
              onClick={() => createSession(subject.value)}
              disabled={creating || !selectedChild}
              className="p-6 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className={`w-12 h-12 rounded-xl ${subject.color} flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform`}>
                {subject.icon}
              </div>
              <h3 className="font-medium text-gray-900">{subject.label}</h3>
              <p className="text-sm text-gray-500 mt-1">点击开始</p>
            </button>
          ))}
        </div>

        {/* 功能说明 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              AI 助手功能
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">📐 数学辅导</h4>
                <p className="text-sm text-blue-700">
                  解答数学问题，提供解题思路，引导思考
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">📖 英语学习</h4>
                <p className="text-sm text-green-700">
                  单词记忆，语法讲解，口语练习
                </p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg">
                <h4 className="font-medium text-amber-900 mb-2">📝 作业答疑</h4>
                <p className="text-sm text-amber-700">
                  辅导作业，解释概念，提供练习
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 历史会话 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-gray-500" />
              历史会话
            </CardTitle>
            <Badge variant="secondary">{sessions.length} 个会话</Badge>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">加载中...</div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">暂无历史会话</p>
                <p className="text-sm text-gray-400 mt-1">
                  点击上方卡片开始新的对话吧
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/dashboard/chat/${session.id}`}
                    className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {session.summary}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(session.lastMessageAt)}
                          <span>•</span>
                          <span>{session.messageCount} 条消息</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 底部提示 */}
        <div className="text-center text-sm text-gray-500">
          <p>💡 提示：AI 助手会引导孩子思考，而不是直接给出答案</p>
        </div>
      </div>
    </div>
  );
}
