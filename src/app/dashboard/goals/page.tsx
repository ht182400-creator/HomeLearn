"use client";

import { useState, useEffect } from "react";
import {
  Target,
  Plus,
  Trophy,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
  Trash2,
  ChevronRight,
  Calendar,
  Flame,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/lib/stores/auth-store";
import { calculateProgress, getGoalStatus, formatRemainingTime, GOAL_TEMPLATES } from "@/lib/validators/goal";

interface Goal {
  id: string;
  title: string;
  description?: string;
  type: "daily" | "weekly" | "monthly" | "custom";
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate?: string;
  endDate?: string;
  status: "active" | "paused" | "completed" | "cancelled";
  subject?: { id: string; name: string; color: string };
  createdAt: string;
}

export default function GoalsPage() {
  const { user, children } = useAuthStore();
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 });
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "daily" as "daily" | "weekly" | "monthly" | "custom",
    targetValue: 10,
    unit: "次",
    startDate: "",
    endDate: "",
    subjectId: "",
  });

  // 设置默认孩子
  useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  // 加载目标列表
  useEffect(() => {
    if (selectedChild) {
      loadGoals();
    }
  }, [selectedChild]);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/goals?childId=${selectedChild}`);
      const data = await res.json();
      if (data.success) {
        setGoals(data.data.goals);
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error("加载目标失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async () => {
    if (!selectedChild || !formData.title) return;

    setCreating(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: selectedChild,
          ...formData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsDialogOpen(false);
        setFormData({
          title: "",
          description: "",
          type: "daily",
          targetValue: 10,
          unit: "次",
          startDate: "",
          endDate: "",
          subjectId: "",
        });
        loadGoals();
      }
    } catch (error) {
      console.error("创建目标失败:", error);
    } finally {
      setCreating(false);
    }
  };

  const updateGoalStatus = async (goalId: string, status: string) => {
    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        loadGoals();
      }
    } catch (error) {
      console.error("更新状态失败:", error);
    }
  };

  const deleteGoal = async (goalId: string) => {
    if (!confirm("确定要删除这个目标吗？")) return;

    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadGoals();
      }
    } catch (error) {
      console.error("删除目标失败:", error);
    }
  };

  const applyTemplate = (template: typeof GOAL_TEMPLATES[0]) => {
    setFormData((prev) => ({
      ...prev,
      title: template.title,
      description: template.description,
      type: template.type,
    }));
  };

  const statusConfig = {
    active: { color: "bg-blue-100 text-blue-700", label: "进行中", icon: Play },
    completed: { color: "bg-green-100 text-green-700", label: "已完成", icon: CheckCircle2 },
    paused: { color: "bg-gray-100 text-gray-700", label: "已暂停", icon: Pause },
    cancelled: { color: "bg-red-100 text-red-700", label: "已取消", icon: AlertCircle },
  };

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="h-8 w-8 text-amber-500" />
              学习目标
            </h1>
            <p className="text-gray-600 mt-1">设定目标，追踪成长</p>
          </div>

          <div className="flex items-center gap-4">
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="选择孩子" />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.nickname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-amber-500 hover:bg-amber-600">
                  <Plus className="h-4 w-4 mr-2" />
                  新建目标
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>创建学习目标</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* 快速模板 */}
                  <div>
                    <Label className="text-sm text-gray-500">快速模板</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {GOAL_TEMPLATES.slice(0, 4).map((template) => (
                        <button
                          key={template.title}
                          onClick={() => applyTemplate(template)}
                          className="p-2 text-left text-sm border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <span className="mr-1">{template.icon}</span>
                          {template.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>目标名称 *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="例如：每日练习数学"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>描述</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="目标的详细描述..."
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>目标类型</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(v) => setFormData({ ...formData, type: v as any })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">每日</SelectItem>
                          <SelectItem value="weekly">每周</SelectItem>
                          <SelectItem value="monthly">每月</SelectItem>
                          <SelectItem value="custom">自定义</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>目标值</Label>
                      <Input
                        type="number"
                        value={formData.targetValue}
                        onChange={(e) => setFormData({ ...formData, targetValue: parseInt(e.target.value) || 0 })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>单位</Label>
                      <Input
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        placeholder="次/道/小时"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>开始日期</Label>
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>截止日期</Label>
                      <Input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={createGoal}
                    disabled={creating || !formData.title}
                    className="w-full bg-amber-500 hover:bg-amber-600"
                  >
                    {creating ? "创建中..." : "创建目标"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Flame className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">进行中</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">已完成</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">总计</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 进行中的目标 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              进行中
              <Badge variant="secondary">{activeGoals.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">加载中...</div>
            ) : activeGoals.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">暂无进行中的目标</p>
                <p className="text-sm text-gray-400 mt-1">点击右上角按钮创建新目标</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeGoals.map((goal) => {
                  const progress = calculateProgress(goal.currentValue, goal.targetValue);
                  const status = getGoalStatus({
                    startDate: goal.startDate,
                    endDate: goal.endDate,
                    currentValue: goal.currentValue,
                    targetValue: goal.targetValue,
                    status: goal.status,
                  });

                  return (
                    <div
                      key={goal.id}
                      className="p-4 border border-gray-200 rounded-xl hover:border-amber-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{goal.title}</h4>
                          {goal.description && (
                            <p className="text-sm text-gray-500 mt-1">{goal.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              status === "at_risk"
                                ? "bg-red-100 text-red-700"
                                : status === "overdue"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-blue-100 text-blue-700"
                            }
                          >
                            {status === "at_risk" && <AlertCircle className="h-3 w-3 mr-1" />}
                            {status === "overdue" ? "已过期" : status === "at_risk" ? "有风险" : "正常"}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            {goal.currentValue} / {goal.targetValue} {goal.unit}
                          </span>
                          <span className="font-medium text-amber-600">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {goal.endDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatRemainingTime(goal.endDate)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {goal.type === "daily" ? "每日" : goal.type === "weekly" ? "每周" : "每月"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateGoalStatus(goal.id, "paused")}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateGoalStatus(goal.id, "completed")}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteGoal(goal.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 已完成的目标 */}
        {completedGoals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-green-500" />
                已完成
                <Badge variant="secondary">{completedGoals.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {completedGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="flex items-center justify-between p-3 border border-green-200 rounded-lg bg-green-50"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <h4 className="font-medium text-gray-900">{goal.title}</h4>
                        <p className="text-sm text-gray-500">
                          完成 {goal.targetValue} {goal.unit}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteGoal(goal.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
