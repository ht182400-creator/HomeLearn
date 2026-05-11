/**
 * OCR 图片识别工具函数
 */
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// OCR 状态类型
export type OcrStatus = 'pending' | 'processing' | 'completed' | 'failed'

// 识别结果类型
export interface OcrResult {
  id: string
  status: OcrStatus
  originalText: string | null
  extractedText: string | null
  subject: string | null
  questionType: string | null
  confidence: number | null
  error: string | null
  createdAt: string
  completedAt: string | null
}

// OCR 识别请求类型
export interface OcrRequest {
  imageBase64: string
  subject?: string
  questionType?: string
}

// OCR 验证器
export const ocrRequestSchema = {
  validate(request: Partial<OcrRequest>): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!request.imageBase64) {
      errors.push('图片不能为空')
    } else if (typeof request.imageBase64 !== 'string') {
      errors.push('图片格式无效')
    } else if (request.imageBase64.length < 100) {
      errors.push('图片数据不完整')
    }

    const validSubjects = ['math', 'english', 'chinese', 'physics', 'chemistry', 'biology', 'history', 'geography', 'politics', 'other']
    if (request.subject && !validSubjects.includes(request.subject)) {
      errors.push(`科目必须是以下之一: ${validSubjects.join(', ')}`)
    }

    const validQuestionTypes = ['choice', 'fill', '解答', '证明', '计算', 'other']
    if (request.questionType && !validQuestionTypes.includes(request.questionType)) {
      errors.push(`题目类型必须是以下之一: ${validQuestionTypes.join(', ')}`)
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  },
}

// 格式化识别结果
export function formatOcrResult(result: OcrResult): string {
  if (result.status === 'failed') {
    return `识别失败: ${result.error || '未知错误'}`
  }

  if (result.status === 'processing') {
    return '正在识别中...'
  }

  if (!result.extractedText) {
    return '未提取到文本'
  }

  const subjectLabel = result.subject ? getSubjectLabel(result.subject) : '未分类'
  const confidenceLabel = result.confidence ? `${Math.round(result.confidence * 100)}%` : '未知'

  return `
科目: ${subjectLabel}
类型: ${result.questionType || '未指定'}
置信度: ${confidenceLabel}
---
${result.extractedText}
`.trim()
}

// 获取科目标签
export function getSubjectLabel(subject: string): string {
  const labels: Record<string, string> = {
    math: '数学',
    english: '英语',
    chinese: '语文',
    physics: '物理',
    chemistry: '化学',
    biology: '生物',
    history: '历史',
    geography: '地理',
    politics: '政治',
    other: '其他',
  }
  return labels[subject] || subject
}

// 获取科目选项
export function getSubjectOptions(): Array<{ value: string; label: string }> {
  return [
    { value: 'math', label: '数学' },
    { value: 'english', label: '英语' },
    { value: 'chinese', label: '语文' },
    { value: 'physics', label: '物理' },
    { value: 'chemistry', label: '化学' },
    { value: 'biology', label: '生物' },
    { value: 'history', label: '历史' },
    { value: 'geography', label: '地理' },
    { value: 'politics', label: '政治' },
    { value: 'other', label: '其他' },
  ]
}

// 获取题目类型选项
export function getQuestionTypeOptions(): Array<{ value: string; label: string }> {
  return [
    { value: 'choice', label: '选择题' },
    { value: 'fill', label: '填空题' },
    { value: '解答', label: '解答题' },
    { value: '证明', label: '证明题' },
    { value: '计算', label: '计算题' },
    { value: 'other', label: '其他' },
  ]
}

// 格式化相对时间
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: zhCN })
}

// 获取状态标签
export function getStatusLabel(status: OcrStatus): string {
  const labels: Record<OcrStatus, string> = {
    pending: '等待中',
    processing: '识别中',
    completed: '已完成',
    failed: '失败',
  }
  return labels[status]
}

// 获取状态颜色
export function getStatusColor(status: OcrStatus): string {
  const colors: Record<OcrStatus, string> = {
    pending: 'bg-yellow-500',
    processing: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  }
  return colors[status]
}
