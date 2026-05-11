'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getSubjectOptions, getQuestionTypeOptions, formatOcrResult, OcrResult } from '@/lib/validators/ocr'
import { Camera, Upload, FileText, Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'

export default function OcrPage() {
  const [image, setImage] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [subject, setSubject] = useState<string>('')
  const [questionType, setQuestionType] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<OcrResult | null>(null)
  const [dragActive, setDragActive] = useState(false)

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  // 处理拖拽上传
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  // 处理文件
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件')
      return
    }
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      setImage(base64)
      setResult(null)
    }
    reader.readAsDataURL(file)
  }

  // 提交识别
  const handleSubmit = async () => {
    if (!image) {
      alert('请先上传图片')
      return
    }

    setIsProcessing(true)
    setResult(null)

    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: image,
          subject: subject || undefined,
          questionType: questionType || undefined,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || '识别失败')
      }

      setResult(data)
    } catch (error) {
      console.error('OCR error:', error)
      alert(error instanceof Error ? error.message : '识别失败，请稍后重试')
    } finally {
      setIsProcessing(false)
    }
  }

  // 跳转到题目录入
  const goToQuestionEntry = () => {
    if (result?.extractedText) {
      const params = new URLSearchParams()
      params.set('content', result.extractedText)
      if (result.subject) params.set('subject', result.subject)
      if (result.questionType) params.set('questionType', result.questionType)
      window.location.href = `/dashboard/questions/new?${params.toString()}`
    }
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">图片识别录入</h1>
        <p className="text-muted-foreground mt-2">拍照或上传题目图片，AI 自动识别并提取内容</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 左侧：上传区域 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              上传题目图片
            </CardTitle>
            <CardDescription>支持拍照或从相册选择图片</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 上传区域 */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-primary/10 p-4">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-medium">点击上传或拖拽图片到这里</p>
                  <p className="text-sm text-muted-foreground mt-1">支持 JPG、PNG、GIF 格式</p>
                </div>
              </div>
            </div>

            {/* 图片预览 */}
            {image && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>图片预览</Label>
                  <Button variant="ghost" size="sm" onClick={() => { setImage(null); setFileName(''); setResult(null) }}>
                    清除
                  </Button>
                </div>
                <div className="relative rounded-lg overflow-hidden border">
                  <img src={image} alt="Preview" className="w-full h-auto max-h-64 object-contain" />
                </div>
                {fileName && <p className="text-sm text-muted-foreground truncate">{fileName}</p>}
              </div>
            )}

            {/* 选项 */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">科目（可选）</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger id="subject">
                      <SelectValue placeholder="选择科目" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSubjectOptions().map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="questionType">题型（可选）</Label>
                  <Select value={questionType} onValueChange={setQuestionType}>
                    <SelectTrigger id="questionType">
                      <SelectValue placeholder="选择题型" />
                    </SelectTrigger>
                    <SelectContent>
                      {getQuestionTypeOptions().map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 提交按钮 */}
            <Button className="w-full" size="lg" onClick={handleSubmit} disabled={!image || isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  识别中...
                </>
              ) : (
                <>
                  开始识别
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 右侧：结果区域 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              识别结果
            </CardTitle>
            <CardDescription>识别后的题目内容可以直接编辑</CardDescription>
          </CardHeader>
          <CardContent>
            {!result && !isProcessing && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">上传图片后将在此显示识别结果</p>
              </div>
            )}

            {isProcessing && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                <p className="font-medium">正在识别中...</p>
                <p className="text-sm text-muted-foreground mt-1">请稍候，预计需要 1-2 秒</p>
              </div>
            )}

            {result && result.status === 'completed' && (
              <div className="space-y-4">
                {/* 状态指示 */}
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">识别成功</span>
                  {result.confidence && (
                    <span className="text-sm text-muted-foreground">
                      （置信度: {Math.round(result.confidence * 100)}%）
                    </span>
                  )}
                </div>

                {/* 识别内容 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>识别内容</Label>
                    <div className="flex gap-2">
                      {result.subject && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {result.subject === 'math' ? '数学' : result.subject}
                        </span>
                      )}
                      {result.questionType && (
                        <span className="text-xs bg-secondary px-2 py-1 rounded">
                          {result.questionType}
                        </span>
                      )}
                    </div>
                  </div>
                  <Textarea
                    value={result.extractedText || ''}
                    onChange={(e) => setResult({ ...result, extractedText: e.target.value })}
                    className="min-h-[200px] font-mono text-sm"
                    placeholder="识别结果将显示在这里"
                  />
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleSubmit} disabled={isProcessing}>
                    重新识别
                  </Button>
                  <Button className="flex-1" onClick={goToQuestionEntry}>
                    录入题库
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {result && result.status === 'failed' && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-red-100 p-4 mb-4">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <p className="font-medium text-red-600">识别失败</p>
                <p className="text-sm text-muted-foreground mt-1">{result.error || '请尝试重新上传图片'}</p>
                <Button variant="outline" className="mt-4" onClick={() => setResult(null)}>
                  重新上传
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 使用提示 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">使用提示</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>拍摄时保持光线充足，文字清晰可见，可获得更好的识别效果</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>如果识别结果有误，可以在下方编辑框中手动修改</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>识别成功后点击"录入题库"可直接跳转到题目录入页面</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>建议提前选择科目和题型，可提高识别准确率</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
