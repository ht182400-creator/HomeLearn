"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  FileText,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit3,
  Save,
  ArrowLeft,
} from "lucide-react";

// 年级代码映射
const GRADE_CODE_MAP: Record<string, string> = {
  "1": "PRIMARY_1",
  "2": "PRIMARY_2",
  "3": "PRIMARY_3",
  "4": "PRIMARY_4",
  "5": "PRIMARY_5",
  "6": "PRIMARY_6",
  "7": "MIDDLE_1",
  "8": "MIDDLE_2",
  "9": "MIDDLE_3",
  "10": "HIGH_1",
  "11": "HIGH_2",
  "12": "HIGH_3",
};

// 题目识别结果类型
interface QuestionBlock {
  number: string | null;
  type: string;
  content: string;
  options?: { label: string; content: string }[];
  answer?: string;
  explanation?: string;
  confidence: number;
  selected?: boolean; // 是否选中导入
}

interface AnalysisResult {
  subject: string;
  subjectLabel: string;
  grade: string;
  questionCount: number;
  confidence: number;
}

export default function PDFImportPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 状态
  const [step, setStep] = useState<"upload" | "configure" | "preview" | "importing">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  // 配置
  const [subject, setSubject] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [autoDetect, setAutoDetect] = useState(true);

  // 分析结果
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [questions, setQuestions] = useState<QuestionBlock[]>([]);
  const [rawText, setRawText] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [importProgress, setImportProgress] = useState(0);

  // 年级选项
  const GRADE_OPTIONS = [
    { value: "1", label: "一年级" },
    { value: "2", label: "二年级" },
    { value: "3", label: "三年级" },
    { value: "4", label: "四年级" },
    { value: "5", label: "五年级" },
    { value: "6", label: "六年级" },
    { value: "7", label: "七年级" },
    { value: "8", label: "八年级" },
    { value: "9", label: "九年级" },
    { value: "10", label: "高一" },
    { value: "11", label: "高二" },
    { value: "12", label: "高三" },
  ];

  // 科目选项
  const SUBJECT_OPTIONS = [
    { value: "math", label: "数学" },
    { value: "chinese", label: "语文" },
    { value: "english", label: "英语" },
    { value: "physics", label: "物理" },
    { value: "chemistry", label: "化学" },
    { value: "biology", label: "生物" },
    { value: "history", label: "历史" },
    { value: "geography", label: "地理" },
    { value: "politics", label: "道德与法治" },
  ];

  // 文件选择处理
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (file.type !== "application/pdf") {
      showToast("请选择 PDF 文件", "error");
      return;
    }

    // 验证文件大小 (最大 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast("文件大小不能超过 10MB", "error");
      return;
    }

    setSelectedFile(file);
    
    // 转换为 Base64
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPdfBase64(result);
    };
    reader.readAsDataURL(file);
  }, [showToast]);

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      const fakeEvent = {
        target: { files: [file] }
      } as any;
      handleFileSelect(fakeEvent);
    } else {
      showToast("请拖入 PDF 文件", "error");
    }
  }, [handleFileSelect, showToast]);

  // 解析 PDF 并识别题目
  const handleParse = async () => {
    if (!pdfBase64) {
      showToast("请先选择 PDF 文件", "error");
      return;
    }

    if (!autoDetect && (!subject || !grade)) {
      showToast("请选择或自动识别年级和科目", "error");
      return;
    }

    setAnalyzing(true);
    setStep("configure");

    try {
      const response = await fetch("/api/pdf-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfBase64,
          subject: autoDetect ? undefined : subject,
          grade: autoDetect ? undefined : grade,
          autoDetect,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "解析失败");
      }

      // 更新分析结果
      setAnalysisResult(data.analysis);
      setQuestions(data.questions.map((q: QuestionBlock) => ({ ...q, selected: true })));
      setRawText(data.rawText);
      setTotalPages(data.file.totalPages);

      // 如果自动识别，更新表单
      if (autoDetect) {
        setSubject(data.analysis.subject);
        setGrade(data.analysis.grade);
      }

      setStep("preview");
      showToast(`识别到 ${data.analysis.questionCount} 道题目`, "success");
    } catch (error: any) {
      showToast(error.message || "解析失败", "error");
      setStep("upload");
    } finally {
      setAnalyzing(false);
    }
  };

  // 切换题目选中状态
  const toggleQuestion = (index: number) => {
    setQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, selected: !q.selected } : q
    ));
  };

  // 全选/取消全选
  const toggleAll = () => {
    const allSelected = questions.every(q => q.selected);
    setQuestions(prev => prev.map(q => ({ ...q, selected: !allSelected })));
  };

  // 批量导入题目
  const handleImport = async () => {
    const selectedQuestions = questions.filter(q => q.selected);
    
    if (selectedQuestions.length === 0) {
      showToast("请至少选择一道题目导入", "error");
      return;
    }

    setStep("importing");
    setImportProgress(0);

    // 获取科目 ID
    let subjectId = subject;
    try {
      const subjectRes = await fetch(`/api/subjects/by-code?code=${subject}`);
      if (subjectRes.ok) {
        const data = await subjectRes.json();
        subjectId = data.subject.id;
      }
    } catch (error) {
      console.error("获取科目ID失败:", error);
    }

    // 获取年级 ID
    const gradeId = grade ? (GRADE_CODE_MAP[grade] || grade) : undefined;

    let imported = 0;
    let failed = 0;

    for (let i = 0; i < selectedQuestions.length; i++) {
      const q = selectedQuestions[i];
      
      try {
        // 构建选项 JSON（选择题）
        let answerJson = q.answer || "";
        if (q.type === "choice" && q.options) {
          const correctIndex = q.options.findIndex(
            opt => opt.label.toUpperCase() === (q.answer || "").toUpperCase()
          );
          if (correctIndex >= 0) {
            answerJson = JSON.stringify({
              type: "single_choice",
              correctIndex,
              options: q.options.map(opt => ({ label: opt.label, content: opt.content })),
            });
          }
        }

        // 转换题目格式
        const questionData = {
          content: q.content,
          type: convertType(q.type),
          subjectId,
          gradeId,
          difficulty: "MEDIUM",
          answer: answerJson,
          explanation: q.explanation || "",
        };

        const response = await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(questionData),
        });

        if (response.ok) {
          imported++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }

      setImportProgress(Math.round(((i + 1) / selectedQuestions.length) * 100));
    }

    setImportProgress(100);
    
    if (imported > 0) {
      showToast(`成功导入 ${imported} 道题目${failed > 0 ? `，${failed} 道失败` : ""}`, "success");
      setTimeout(() => router.push("/dashboard/questions"), 1500);
    } else {
      showToast("导入失败，请重试", "error");
      setStep("preview");
    }
  };

  // 转换题目类型
  const convertType = (type: string): string => {
    const map: Record<string, string> = {
      "choice": "SINGLE_CHOICE",
      "fill": "FILL_BLANK",
      "解答": "FREE_RESPONSE",
      "计算": "CALCULATION",
      "证明": "PROOF",
      "其他": "OTHER",
    };
    return map[type] || "OTHER";
  };

  // 获取类型标签
  const getTypeLabel = (type: string): string => {
    const map: Record<string, string> = {
      "choice": "选择题",
      "fill": "填空题",
      "解答": "解答题",
      "计算": "计算题",
      "证明": "证明题",
      "其他": "其他",
    };
    return map[type] || type;
  };

  // 渲染上传步骤
  const renderUploadStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            PDF 文件导入
          </CardTitle>
          <CardDescription>
            上传 PDF 文件，自动识别题目并导入题库
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 拖拽上传区域 */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
              "hover:border-primary hover:bg-primary/5",
              selectedFile ? "border-green-500 bg-green-50" : "border-gray-300"
            )}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
            
            {selectedFile ? (
              <div className="space-y-2">
                <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
                <p className="font-medium text-green-700">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  重新选择
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-12 h-12 mx-auto text-gray-400" />
                <p className="font-medium text-gray-700">点击或拖拽 PDF 文件到此处</p>
                <p className="text-sm text-gray-500">支持 PDF 文件，最大 10MB</p>
              </div>
            )}
          </div>

          {/* 提示信息 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>支持的文件格式：</strong>PDF 文件（文本型或扫描版）</p>
                <p><strong>识别内容：</strong>题目编号、题型、内容、选项、答案、解析</p>
                <p><strong>年级/科目：</strong>支持手动指定或自动识别</p>
              </div>
            </div>
          </div>

          {/* 下一步按钮 */}
          {selectedFile && (
            <div className="flex justify-end">
              <Button 
                onClick={() => setStep("configure")}
                className="w-full sm:w-auto"
              >
                下一步：配置参数
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // 渲染配置步骤
  const renderConfigureStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>配置识别参数</CardTitle>
        <CardDescription>
          选择年级和科目，或让 AI 自动识别
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 自动识别开关 */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <Label className="text-base font-medium">自动识别年级和科目</Label>
            <p className="text-sm text-gray-500">让 AI 根据内容自动判断</p>
          </div>
          <button
            type="button"
            className={cn(
              "relative w-16 h-8 rounded-full transition-colors",
              autoDetect ? "bg-green-500" : "bg-gray-300"
            )}
            onClick={() => setAutoDetect(!autoDetect)}
          >
            <span
              className={cn(
                "absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform",
                autoDetect ? "translate-x-8" : "translate-x-0"
              )}
            />
          </button>
        </div>

        {/* 手动选择 */}
        {!autoDetect && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>科目</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="选择科目" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>年级</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="选择年级" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* 文件信息 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-red-500" />
            <div>
              <p className="font-medium">{selectedFile?.name}</p>
              <p className="text-sm text-gray-500">
                {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => setStep("upload")}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
          <Button onClick={handleParse} disabled={analyzing} className="flex-1">
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                正在解析...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                解析 PDF
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // 渲染预览步骤
  const renderPreviewStep = () => (
    <div className="space-y-6">
      {/* 分析结果摘要 */}
      <Card>
        <CardHeader>
          <CardTitle>识别结果</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{analysisResult?.questionCount || 0}</p>
              <p className="text-sm text-gray-600">识别题目</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {Math.round((analysisResult?.confidence || 0) * 100)}%
              </p>
              <p className="text-sm text-gray-600">置信度</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {SUBJECT_OPTIONS.find(s => s.value === analysisResult?.subject)?.label || "-"}
              </p>
              <p className="text-sm text-gray-600">科目</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-orange-600">
                {GRADE_OPTIONS.find(g => g.value === analysisResult?.grade)?.label || analysisResult?.grade || "-"}
              </p>
              <p className="text-sm text-gray-600">年级</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 题目列表 */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>题目预览</CardTitle>
            <CardDescription>
              已选择 {questions.filter(q => q.selected).length} / {questions.length} 道题目
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={toggleAll}>
            {questions.every(q => q.selected) ? "取消全选" : "全选"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {questions.map((q, index) => (
              <div
                key={index}
                className={cn(
                  "border rounded-lg p-4 transition-colors cursor-pointer",
                  q.selected ? "border-green-500 bg-green-50" : "border-gray-200"
                )}
                onClick={() => toggleQuestion(index)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                      q.selected ? "bg-green-500 border-green-500" : "border-gray-300"
                    )}
                  >
                    {q.selected && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {q.number && (
                        <span className="font-bold text-blue-600">第{q.number}题</span>
                      )}
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs",
                        q.type === "choice" ? "bg-blue-100 text-blue-700" :
                        q.type === "fill" ? "bg-green-100 text-green-700" :
                        "bg-purple-100 text-purple-700"
                      )}>
                        {getTypeLabel(q.type)}
                      </span>
                      <span className="text-xs text-gray-400">
                        置信度 {Math.round(q.confidence * 100)}%
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{q.content}</p>
                    
                    {/* 选择题选项 */}
                    {q.options && q.options.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {q.options.map((opt, i) => (
                          <div key={i} className="text-sm text-gray-600">
                            <span className="font-medium">{opt.label}.</span> {opt.content}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* 答案 */}
                    {q.answer && (
                      <p className="mt-2 text-sm text-green-600">
                        <strong>答案：</strong>{q.answer}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-4 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setStep("configure")}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
            <Button onClick={handleImport} className="flex-1" disabled={questions.filter(q => q.selected).length === 0}>
              <Save className="w-4 h-4 mr-2" />
              导入选中题目 ({questions.filter(q => q.selected).length})
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // 渲染导入中步骤
  const renderImportingStep = () => (
    <Card>
      <CardContent className="py-12">
        <div className="text-center space-y-6">
          <Loader2 className="w-16 h-16 mx-auto animate-spin text-primary" />
          <div>
            <h3 className="text-xl font-medium">正在导入题目...</h3>
            <p className="text-gray-500 mt-2">
              已导入 {questions.filter(q => q.selected).length} 道题目中的 {Math.round(importProgress / 100 * questions.filter(q => q.selected).length)} 道
            </p>
          </div>
          <Progress value={importProgress} className="max-w-md mx-auto" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2 text-gray-500 hover:text-gray-700"
          onClick={() => router.push("/dashboard/questions")}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回题库列表
        </Button>
        <h1 className="text-2xl font-bold">PDF 导入题库</h1>
        <p className="text-gray-500">将 PDF 文件中的题目自动解析并导入题库</p>
      </div>

      {/* 步骤指示器 */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
            step === "upload" ? "bg-primary text-white" : "bg-green-500 text-white"
          )}>
            {step !== "upload" ? <CheckCircle2 className="w-5 h-5" /> : "1"}
          </div>
          <div className={cn("w-12 h-0.5", step !== "upload" ? "bg-green-500" : "bg-gray-200")} />
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
            step === "configure" ? "bg-primary text-white" :
            ["preview", "importing"].includes(step) ? "bg-green-500 text-white" : "bg-gray-200"
          )}>
            {["preview", "importing"].includes(step) ? <CheckCircle2 className="w-5 h-5" /> : "2"}
          </div>
          <div className={cn("w-12 h-0.5", step === "importing" ? "bg-green-500" : "bg-gray-200")} />
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
            step === "preview" ? "bg-primary text-white" :
            step === "importing" ? "bg-green-500 text-white" : "bg-gray-200"
          )}>
            {step === "importing" ? <CheckCircle2 className="w-5 h-5" /> : "3"}
          </div>
        </div>
        <div className="flex items-center gap-8 ml-4 text-sm text-gray-500">
          <span>上传</span>
          <span>配置</span>
          <span>导入</span>
        </div>
      </div>

      {/* 步骤内容 */}
      {step === "upload" && renderUploadStep()}
      {step === "configure" && renderConfigureStep()}
      {step === "preview" && renderPreviewStep()}
      {step === "importing" && renderImportingStep()}
    </div>
  );
}
