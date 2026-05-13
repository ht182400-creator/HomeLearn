import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PracticeSetupForm } from "@/components/dashboard/practice-setup-form";

export const metadata: Metadata = {
  title: "练习中心 - HomeLearn",
  description: "创建和管理孩子的练习任务",
};

export default async function PracticePage() {
  const session = await getServerSession(authOptions);

  // 获取当前用户的孩子列表
  const children = await prisma.childAccount.findMany({
    where: { userId: session?.user?.id },
    select: { id: true, nickname: true, grade: true },
  });

  // 获取当前用户的科目列表（学科是公共数据，不需要 userId 筛选）
  const subjects = await prisma.subject.findMany({
    select: { id: true, name: true, icon: true },
    orderBy: { order: 'asc' },
  });

  // 获取最近练习记录
  const recentSessions = await prisma.practiceRecord.findMany({
    where: {
      child: { userId: session?.user?.id },
    },
    include: {
      child: { select: { id: true, nickname: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">练习中心</h1>
        <p className="text-gray-500 mt-1">创建练习任务，开始学习之旅</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：创建练习 */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">创建新练习</h2>
            <PracticeSetupForm
              children={children}
              subjects={subjects}
            />
          </Card>
        </div>

        {/* 右侧：最近练习 */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">最近练习</h2>
              <Link href="/dashboard/practice/history" className="text-sm text-blue-500 hover:underline">
                查看全部
              </Link>
            </div>

            {recentSessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <p>暂无练习记录</p>
                <p className="text-sm mt-1">开始创建第一个练习吧</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{s.child.nickname}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs",
                        s.completedAt
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      )}>
                        {s.completedAt ? "已完成" : "进行中"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{s.type}</span>
                      {s.score && (
                        <span className="text-green-600 font-medium">{s.score}%</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(s.createdAt).toLocaleDateString("zh-CN")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
