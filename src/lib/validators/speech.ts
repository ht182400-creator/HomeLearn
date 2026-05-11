/**
 * 语音评测工具函数
 */
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// 评测状态类型
export type EvaluationStatus = 'pending' | 'recording' | 'processing' | 'completed' | 'failed'

// 评测结果类型
export interface EvaluationResult {
  id: string
  status: EvaluationStatus
  audioUrl: string | null
  transcript: string | null
  pronunciation: number | null  // 发音分数 0-100
  fluency: number | null        // 流畅度分数 0-100
  accuracy: number | null       // 准确度分数 0-100
  overall: number | null        // 综合分数 0-100
  feedback: string | null       // 改进建议
  error: string | null
  duration: number | null       // 录音时长(秒)
  createdAt: string
  completedAt: string | null
}

// 评测请求类型
export interface EvaluationRequest {
  audioBase64: string
  referenceText: string
  type: 'read_sentence' | 'read_paragraph' | 'free_speak'
}

// 评测类型选项
export interface SpeechTypeOption {
  value: string
  label: string
  description: string
  icon: string
}

// 评测验证器
export const evaluationRequestSchema = {
  validate(request: Partial<EvaluationRequest>): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!request.audioBase64) {
      errors.push('音频不能为空')
    } else if (typeof request.audioBase64 !== 'string') {
      errors.push('音频格式无效')
    } else if (request.audioBase64.length < 1000) {
      errors.push('音频数据不完整')
    }

    if (!request.referenceText) {
      errors.push('参考答案不能为空')
    } else if (request.referenceText.length < 2) {
      errors.push('参考答案太短')
    }

    const validTypes = ['read_sentence', 'read_paragraph', 'free_speak']
    if (request.type && !validTypes.includes(request.type)) {
      errors.push(`评测类型必须是以下之一: ${validTypes.join(', ')}`)
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  },
}

// 获取评测类型选项
export function getSpeechTypeOptions(): SpeechTypeOption[] {
  return [
    {
      value: 'read_sentence',
      label: '跟读句子',
      description: '朗读指定的英语句子，练习发音和语调',
      icon: '📝',
    },
    {
      value: 'read_paragraph',
      label: '朗读段落',
      description: '朗读较长的英语段落，提升流畅度',
      icon: '📄',
    },
    {
      value: 'free_speak',
      label: '自由表达',
      description: '根据主题自由表达，锻炼口语能力',
      icon: '🎤',
    },
  ]
}

// 获取评测类型标签
export function getSpeechTypeLabel(type: string): string {
  const options = getSpeechTypeOptions()
  return options.find((o) => o.value === type)?.label || type
}

// 获取分数等级
export function getScoreLevel(score: number): { label: string; color: string; emoji: string } {
  if (score >= 90) {
    return { label: '优秀', color: 'text-green-600', emoji: '🌟' }
  } else if (score >= 80) {
    return { label: '良好', color: 'text-blue-600', emoji: '👍' }
  } else if (score >= 70) {
    return { label: '中等', color: 'text-yellow-600', emoji: '💪' }
  } else if (score >= 60) {
    return { label: '及格', color: 'text-orange-600', emoji: '⚠️' }
  } else {
    return { label: '需改进', color: 'text-red-600', emoji: '📚' }
  }
}

// 格式化评测结果
export function formatEvaluationResult(result: EvaluationResult): string {
  if (result.status === 'failed') {
    return `评测失败: ${result.error || '未知错误'}`
  }

  if (result.status === 'processing') {
    return '正在评测中...'
  }

  if (!result.overall) {
    return '暂无评测结果'
  }

  const level = getScoreLevel(result.overall)

  return `
综合评分: ${result.overall}分 ${level.emoji} ${level.label}
发音得分: ${result.pronunciation || '-'}
流畅度: ${result.fluency || '-'}
准确度: ${result.accuracy || '-'}

转写文本: ${result.transcript || '无'}
${result.feedback ? `\n改进建议: ${result.feedback}` : ''}
`.trim()
}

// 格式化相对时间
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: zhCN })
}

// 获取状态标签
export function getStatusLabel(status: EvaluationStatus): string {
  const labels: Record<EvaluationStatus, string> = {
    pending: '等待开始',
    recording: '录音中',
    processing: '评测中',
    completed: '已完成',
    failed: '失败',
  }
  return labels[status]
}

// 获取状态颜色
export function getStatusColor(status: EvaluationStatus): string {
  const colors: Record<EvaluationStatus, string> = {
    pending: 'bg-gray-500',
    recording: 'bg-red-500 animate-pulse',
    processing: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  }
  return colors[status]
}

// 示例评测文本
export const sampleSentences = [
  { text: 'The quick brown fox jumps over the lazy dog.', level: 'easy' },
  { text: 'Practice makes perfect.', level: 'easy' },
  { text: 'Knowledge is power.', level: 'easy' },
  { text: 'Reading makes a full man, conference a ready man, and writing an exact man.', level: 'medium' },
  { text: 'The only limit to our realization of tomorrow is our doubts of today.', level: 'hard' },
]

export const sampleParagraphs = [
  {
    text: 'Education is the most powerful weapon which you can use to change the world. Nelson Mandela believed that education was the key to breaking the cycle of poverty and discrimination.',
    level: 'medium',
  },
  {
    text: 'Climate change is one of the most pressing challenges facing our planet today. Rising global temperatures have led to melting ice caps, rising sea levels, and increasingly severe weather events.',
    level: 'hard',
  },
]

export const freeSpeakTopics = [
  'Describe your favorite place to visit.',
  'What would you do if you won the lottery?',
  'Explain the importance of learning English.',
  'Describe a memorable trip you have taken.',
  'What are your goals for the next five years?',
]
