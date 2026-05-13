'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Search,
  Filter,
  FileQuestion,
  FileText,
  Loader2,
  Eye,
  Edit2,
  Trash2,
  BookOpen,
  Send,
  Check,
  X,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { QUESTION_TYPE_LABELS, getDifficultyColor, getDifficultyLabel } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

interface ChildAccount {
  id: string;
  nickname: string;
  grade: string | null;
}

interface Question {
  id: string;
  type: string;
  difficulty: number;
  content: any;
  subject: { id: string; name: string; color: string };
  grade: string | null;
  createdAt: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  color: string;
}

interface Grade {
  id: string;
  name: string;
  level: number;
}

export default function QuestionsPage() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [children, setChildren] = useState<ChildAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  // 从 URL 参数读取初始学科筛选（支持 subject=code 或 subjectId=id 两种格式）
  const urlSubject = searchParams.get('subject') || searchParams.get('subjectId') || '';
  const [selectedSubject, setSelectedSubject] = useState(urlSubject);
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');
  const [selectedGrade, setSelectedGrade] = useState(searchParams.get('grade') || '');

  // 推送相关状态
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [allowSkip, setAllowSkip] = useState(true);
  const [requireConfirmation, setRequireConfirmation] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [selectedSubject, selectedType, selectedGrade]);

  const fetchData = async () => {
    try {
      const [subjectsRes, gradesRes, childrenRes] = await Promise.all([
        fetch('/api/questions/subjects'),
        fetch('/api/questions/grades'),
        fetch('/api/children'),
      ]);
      const subjectsData = await subjectsRes.json();
      const gradesData = await gradesRes.json();
      const childrenData = await childrenRes.json();
      setSubjects(subjectsData.subjects || subjectsData || []);
      setGrades(gradesData.grades || []);
      // API 直接返回数组或 { error } 对象
      setChildren(Array.isArray(childrenData) ? childrenData : childrenData.children || []);
      await fetchQuestions();
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const params = new URLSearchParams();
      // 判断 selectedSubject 是 cuid id 还是学科 code
      // cuid 格式通常以 cl 开头且长度 > 10，其他视为 code
      if (selectedSubject) {
        const isCuidId = /^cl[a-z0-9]{20,}$/.test(selectedSubject);
        if (isCuidId) {
          params.set('subjectId', selectedSubject);
        } else {
          params.set('subject', selectedSubject);
        }
      }
      if (selectedType) params.set('type', selectedType);
      if (selectedGrade) params.set('grade', selectedGrade);
      
      const res = await fetch(`/api/questions?${params}`);
      const data = await res.json();
      // API 返回 { questions: [...], pagination: {...} }
      setQuestions(data.questions || []);
    } catch (error) {
      console.error('获取题目列表失败:', error);
      setQuestions([]);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这道题目吗？')) return;
    
    try {
      await fetch(`/api/questions/${id}`, { method: 'DELETE' });
      fetchQuestions();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  // 选择/取消选择题目
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedQuestions);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedQuestions(newSet);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedQuestions.size === filteredQuestions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(filteredQuestions.map(q => q.id)));
    }
  };

  // 打开推送对话框
  const openPushDialog = () => {
    if (selectedQuestions.size === 0) {
      showToast('请先选择要推送的题目', 'info');
      return;
    }
    if (children.length === 0) {
      if (confirm('您还没有添加孩子账户，无法推送题目。\n\n是否现在去添加孩子账户？')) {
        window.location.href = '/dashboard/children';
      }
      return;
    }
    setSelectedChildId(children[0].id);
    setTaskTitle('');
    setAllowSkip(true);
    setRequireConfirmation(false);
    // 默认截止日期：7天后
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    setTaskDueDate(defaultDate.toISOString().split('T')[0]);
    setShowPushDialog(true);
  };

  // 提交推送
  const handlePush = async () => {
    if (!selectedChildId) {
      showToast('请选择孩子', 'info');
      return;
    }
    if (!taskTitle.trim()) {
      showToast('请输入任务名称', 'info');
      return;
    }

    setPushLoading(true);
    try {
      const res = await fetch('/api/practice/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: selectedChildId,
          subjectId: selectedSubject || undefined,
          title: taskTitle.trim(),
          questionIds: Array.from(selectedQuestions),
          dueDate: taskDueDate || undefined,
          allowSkip,
          requireConfirmation,
        }),
      });

      if (res.ok) {
        showToast(`成功推送 ${selectedQuestions.size} 道题目给孩子！`, 'success');
        setShowPushDialog(false);
        setSelectedQuestions(new Set());
      } else {
        const data = await res.json();
        showToast(data.error || '推送失败，请重试', 'error');
      }
    } catch (error) {
      console.error('推送失败:', error);
      showToast('推送失败，请检查网络后重试', 'error');
    } finally {
      setPushLoading(false);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    if (!search) return true;
    // 支持 HTML 字符串和 Tiptap JSON 格式
    let contentText = '';
    if (typeof q.content === 'string') {
      contentText = q.content.replace(/<[^>]*>/g, '');
    } else if (q.content?.blocks) {
      contentText = q.content.blocks.map((b: any) => b.content).join(' ');
    }
    return contentText.toLowerCase().includes(search.toLowerCase());
  });

  /**
   * 获取内容预览 - 支持 HTML 字符串、Tiptap JSON、纯对象格式
   */
  const getContentPreview = (content: any): string => {
    // 空内容返回友好提示（带灰色样式）
    if (!content) return '';

    // 情况1：字符串（可能是 HTML 或纯文本）
    if (typeof content === 'string') {
      const text = content.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
      if (text.length > 60) return text.slice(0, 60);
      if (text) return text;
      // HTML 标签去除后为空，说明可能只有图片或特殊结构
      return '[图片/富媒体题目]';
    }

    // 情况2：Tiptap JSON 格式 { type: "doc", content: [...] }
    if (content?.type === 'doc' && Array.isArray(content.content)) {
      const texts: string[] = [];
      for (const block of content.content) {
        if (block.type === 'paragraph' && Array.isArray(block.content)) {
          for (const inline of block.content) {
            if (inline.type === 'text' && inline.text) texts.push(inline.text);
          }
        } else if (block.type === 'heading' && Array.isArray(block.content)) {
          for (const inline of block.content) {
            if (inline.type === 'text' && inline.text) texts.push(inline.text);
          }
        } else if (block.type === 'image') {
          return '[图片题目]';
        }
      }
      const result = texts.join(' ').trim();
      if (result.length > 60) return result.slice(0, 60);
      if (result) return result;
      return '[图片/富媒体题目]';
    }

    // 情况3：旧的 Tiptap JSON 格式 { blocks: [...] }
    if (Array.isArray(content?.blocks)) {
      const text = content.blocks
        .filter((b: any) => b.type === 'paragraph')
        .map((b: any) => typeof b.content === 'string' ? b.content : '')
        .join(' ')
        .trim();
      if (text.length > 60) return text.slice(0, 60);
      if (text) return text;
    }

    // 情况4：普通对象，尝试递归提取文本字段
    if (typeof content === 'object') {
      const jsonStr = JSON.stringify(content);
      // 检查是否包含图片信息
      if (jsonStr.includes('"type":"image"') || jsonStr.includes('<img')) {
        return '[图片题目]';
      }
      // 提取可能的文本内容
      const textMatch = jsonStr.match(/"text":"([^"]{5,})"/);
      if (textMatch) {
        return textMatch[1].slice(0, 60);
      }
    }

    return '';
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold">题目管理</h1>
            </div>
            <div className="flex gap-2">
              {/* 推送按钮 */}
              {selectedQuestions.size > 0 && (
                <div className="flex items-center gap-2 mr-4">
                  <span className="text-sm text-muted-foreground">
                    已选择 {selectedQuestions.size} 题
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setSelectedQuestions(new Set())}>
                    取消
                  </Button>
                  <Button onClick={openPushDialog}>
                    <Send className="h-4 w-4 mr-2" />
                    推送给孩子
                  </Button>
                </div>
              )}
              <Link href="/dashboard/tasks">
                <Button variant="outline">
                  <BookOpen className="h-4 w-4 mr-2" />
                  推送记录
                </Button>
              </Link>
              <Link href="/dashboard/questions/import">
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  PDF导入
                </Button>
              </Link>
              <Link href="/dashboard/questions/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  添加题目
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索题目..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="">全部学科</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="">全部类型</option>
                {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
              >
                <option value="">全部年级</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Questions List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredQuestions.length === 0 ? (
          <Card className="py-12 text-center">
            <FileQuestion className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              {questions.length === 0 ? '还没有录入题目' : '没有找到匹配的题目'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {questions.length === 0 
                ? '开始录入第一道题目吧'
                : '尝试调整搜索条件'}
            </p>
            {questions.length === 0 && (
              <Link href="/dashboard/questions/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  录入第一道题
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {/* 全选行 */}
            <div className="flex items-center gap-2 py-2">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  selectedQuestions.size === filteredQuestions.length && filteredQuestions.length > 0
                    ? 'bg-primary border-primary'
                    : 'border-gray-300'
                }`}>
                  {selectedQuestions.size === filteredQuestions.length && filteredQuestions.length > 0 && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                全选
              </button>
              <span className="text-sm text-muted-foreground">
                共 {filteredQuestions.length} 题，已选择 {selectedQuestions.size} 题
              </span>
            </div>

            {filteredQuestions.map((question) => (
              <Card key={question.id} className={`card-hover ${selectedQuestions.has(question.id) ? 'ring-2 ring-primary' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {/* 选择框 */}
                    <button
                      onClick={() => toggleSelect(question.id)}
                      className="mt-1 flex-shrink-0"
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedQuestions.has(question.id)
                          ? 'bg-primary border-primary'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}>
                        {selectedQuestions.has(question.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </button>

                    {/* 左侧：内容区域 */}
                    <div className="flex-1 min-w-0">
                      {/* 标签行 */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span 
                          className="text-xs px-2 py-1 rounded"
                          style={{ backgroundColor: question.subject.color + '20', color: question.subject.color }}
                        >
                          {question.subject.name}
                        </span>
                        {question.grade && (
                          <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600">
                            {grades.find(g => g.id === question.grade)?.name || question.grade}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {QUESTION_TYPE_LABELS[question.type]}
                        </span>
                        <span className={`text-xs ${getDifficultyColor(question.difficulty)}`}>
                          {getDifficultyLabel(question.difficulty)}
                        </span>
                      </div>
                      {/* 题目内容预览 */}
                      {(() => {
                        const preview = getContentPreview(question.content);
                        if (!preview) {
                          return (
                            <p className="text-base text-muted-foreground italic">
                              暂无文本预览（点击查看详情）
                            </p>
                          );
                        }
                        return (
                          <p className="text-base">
                            {preview}
                            {preview.length >= 60 && '...'}
                          </p>
                        );
                      })()}
                    </div>

                    {/* 中间：图片预览（如果有） */}
                    {(() => {
                      const imgSrc = typeof question.content === 'string' 
                        ? question.content.match(/src=["']([^"']+)["']/)?.[1] 
                        : null;
                      return imgSrc ? (
                        <div className="flex-shrink-0">
                          <div className="w-32 h-24 rounded-lg border bg-white overflow-hidden relative group cursor-pointer">
                            <img 
                              src={imgSrc}
                              alt="题目图片"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.parentElement!.style.display = 'none';
                              }}
                            />
                            {/* 悬停提示 */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* 右侧：操作按钮 */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <Link href={`/dashboard/questions/${question.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/dashboard/questions/${question.id}/edit`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDelete(question.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* 推送对话框 */}
      {showPushDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">推送题目给孩子</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowPushDialog(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-4 space-y-4">
              {/* 已选择的题目 */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  已选择 {selectedQuestions.size} 道题目
                </label>
                <div className="max-h-32 overflow-y-auto border rounded-md p-2 bg-muted/30">
                  {Array.from(selectedQuestions).map(id => {
                    const q = questions.find(q => q.id === id);
                    return q ? (
                      <div key={id} className="text-sm py-1 border-b last:border-0">
                        {getContentPreview(q.content).slice(0, 40)}...
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              {/* 选择孩子 */}
              <div>
                <label className="text-sm font-medium mb-2 block">选择孩子</label>
                <div className="space-y-2">
                  {children.map(child => (
                    <label
                      key={child.id}
                      className={`flex items-center gap-2 p-2 rounded-md cursor-pointer border transition-colors ${
                        selectedChildId === child.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="child"
                        value={child.id}
                        checked={selectedChildId === child.id}
                        onChange={(e) => setSelectedChildId(e.target.value)}
                        className="accent-primary"
                      />
                      <span className="flex-1">{child.nickname}</span>
                      {child.grade && (
                        <span className="text-xs text-muted-foreground">{child.grade}</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* 任务名称 */}
              <div>
                <label className="text-sm font-medium mb-2 block">任务名称</label>
                <Input
                  placeholder="例如：第五章练习、周末作业"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
              </div>

              {/* 截止日期 */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  截止日期（可选）
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  不填则默认截止日期为 7 天后
                </p>
              </div>

              {/* 作答设置 */}
              <div>
                <label className="text-sm font-medium mb-2 block">作答设置</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowSkip}
                      onChange={(e) => setAllowSkip(e.target.checked)}
                      className="accent-primary"
                    />
                    <span className="text-sm">允许跳过题目</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requireConfirmation}
                      onChange={(e) => setRequireConfirmation(e.target.checked)}
                      className="accent-primary"
                    />
                    <span className="text-sm">完成后需要家长确认</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t bg-muted/30">
              <Button variant="outline" onClick={() => setShowPushDialog(false)}>
                取消
              </Button>
              <Button onClick={handlePush} disabled={pushLoading}>
                {pushLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    推送中...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    确认推送
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
