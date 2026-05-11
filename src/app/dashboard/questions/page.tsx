'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Search,
  Filter,
  FileQuestion,
  Loader2,
  Eye,
  Edit2,
  Trash2,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { QUESTION_TYPE_LABELS, getDifficultyColor, getDifficultyLabel } from '@/lib/utils';

interface Question {
  id: string;
  type: string;
  difficulty: number;
  content: any;
  subject: { id: string; name: string; color: string };
  createdAt: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  color: string;
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedType, setSelectedType] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [selectedSubject, selectedType]);

  const fetchData = async () => {
    try {
      const [subjectsRes] = await Promise.all([
        fetch('/api/questions/subjects'),
      ]);
      const subjectsData = await subjectsRes.json();
      setSubjects(subjectsData);
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
      if (selectedSubject) params.set('subject', selectedSubject);
      if (selectedType) params.set('type', selectedType);
      
      const res = await fetch(`/api/questions?${params}`);
      const data = await res.json();
      setQuestions(data);
    } catch (error) {
      console.error('获取题目列表失败:', error);
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

  const filteredQuestions = questions.filter((q) => {
    if (!search) return true;
    const content = q.content?.blocks?.[0]?.content || '';
    return content.toLowerCase().includes(search.toLowerCase());
  });

  const getContentPreview = (content: any) => {
    if (!content?.blocks) return '题目内容';
    const text = content.blocks
      .filter((b: any) => b.type === 'paragraph')
      .map((b: any) => b.content)
      .join(' ')
      .slice(0, 50);
    return text || '题目内容';
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
            <Link href="/dashboard/questions/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                添加题目
              </Button>
            </Link>
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
                  <option key={s.id} value={s.code}>{s.name}</option>
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
            {filteredQuestions.map((question) => (
              <Card key={question.id} className="card-hover">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span 
                          className="text-xs px-2 py-1 rounded"
                          style={{ backgroundColor: question.subject.color + '20', color: question.subject.color }}
                        >
                          {question.subject.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {QUESTION_TYPE_LABELS[question.type]}
                        </span>
                        <span className={`text-xs ${getDifficultyColor(question.difficulty)}`}>
                          {getDifficultyLabel(question.difficulty)}
                        </span>
                      </div>
                      <p className="text-base">
                        {getContentPreview(question.content)}
                        {getContentPreview(question.content).length >= 50 && '...'}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Link href={`/dashboard/questions/${question.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/dashboard/questions/${question.id}/edit`}>
                        <Button variant="ghost" size="icon">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDelete(question.id)}
                        className="text-destructive hover:text-destructive"
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
    </div>
  );
}
