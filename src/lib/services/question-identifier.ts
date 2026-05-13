/**
 * PDF 题目识别服务 - 使用 AI 解析题目结构
 * 无 API Key 时降级为基于规则的分割
 */
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { env } from 'process'

export interface QuestionBlock {
  number: string | null
  type: 'choice' | 'fill' | '解答' | '证明' | '计算' | '其他'
  content: string
  options?: { label: string; content: string }[]
  answer?: string
  explanation?: string
  confidence: number
}

export interface IdentifiedQuestions {
  subject: string
  subjectLabel: string
  grade: string
  questions: QuestionBlock[]
  rawText: string
  hasApiKey: boolean
}

/**
 * 使用 AI 识别 PDF 中的题目
 */
export async function identifyQuestionsFromText(
  text: string,
  options: {
    subject?: string
    grade?: string
    autoDetect?: boolean
  } = {}
): Promise<IdentifiedQuestions> {
  // 检查是否有 API Key
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn('OPENAI_API_KEY 未设置，使用基于规则的分割方案')
    // 使用规则分割代替 AI 识别
    return splitQuestionsByRules(text, options)
  }

  const { subject, grade, autoDetect = true } = options

  // 构建提示词
  const prompt = buildPrompt(text, subject, grade, autoDetect)

  try {
    const { text: response } = await generateText({
      model: openai('gpt-4o'),
      prompt,
    })

    // 解析 AI 返回的 JSON
    const result = parseAIResponse(response, text)
    return { ...result, hasApiKey: true }
  } catch (error) {
    console.error('AI 题目识别失败:', error)
    // AI 失败时降级为规则分割
    return splitQuestionsByRules(text, options)
  }
}

/**
 * 基于规则分割题目（无 API Key 时的降级方案）
 * 支持多种题号格式：1. / 1、/ (1) / ① / 第1题 / 一、
 */
function splitQuestionsByRules(
  text: string,
  options: { subject?: string; grade?: string } = {}
): IdentifiedQuestions {
  // 1. 预处理：清理页码标记、多余空白
  let cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // 移除 "第 X 页（共 Y 页）" 页码标记
    .replace(/第\s*\d+\s*页\s*[（(]\s*共\s*\d+\s*页\s*[）)]/g, '')
    // 移除单独的 "第 X 页" 标记
    .replace(/第\s*\d+\s*页/g, '')
    // 移除多余的换行
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // 2. 用统一的正则匹配所有题号位置
  // 匹配模式：行首或换行后的题号
  // 支持：1. 1、1．  (1)  ①  第1题  一、
  const questionRegex = /(?:^|\n)\s*(\d+)[\.、．]|(?:^|\n)\s*\((\d+)\)|(?:^|\n)\s*([①②③④⑤⑥⑦⑧⑨⑩])|(?:^|\n)\s*第\s*(\d+)\s*[题问]|(?:^|\n)\s*([一二三四五六七八九十]+)[、．.]/g

  const matches: { index: number; number: string }[] = []
  let m: RegExpExecArray | null

  while ((m = questionRegex.exec(cleaned)) !== null) {
    // 取第一个非空的捕获组作为题号
    const number = m[1] || m[2] || m[3] || m[4] || m[5] || ''
    if (number) {
      matches.push({ index: m.index, number })
    }
  }

  // 3. 按位置排序并去重（位置相差 < 10 视为同一题号）
  matches.sort((a, b) => a.index - b.index)
  const uniqueMatches = matches.filter((item, i) => {
    if (i === 0) return true
    return item.index - matches[i - 1].index > 10
  })

  console.log(`[规则分割] 找到 ${uniqueMatches.length} 个题号位置`)

  // 4. 分割题目
  const questions: QuestionBlock[] = []

  if (uniqueMatches.length >= 2) {
    // 按题号分割
    for (let i = 0; i < uniqueMatches.length; i++) {
      const start = uniqueMatches[i].index
      const end = i < uniqueMatches.length - 1 ? uniqueMatches[i + 1].index : cleaned.length
      let content = cleaned.substring(start, end).trim()

      // 清理内容中的多余换行
      content = content.replace(/\n+/g, '\n').trim()

      if (content.length > 15) {
        questions.push({
          number: uniqueMatches[i].number,
          type: detectQuestionType(content),
          content: content,
          confidence: 0.6,
        })
      }
    }
  } else if (uniqueMatches.length === 1) {
    // 只找到 1 个题号，可能是整份试卷只有 1 题开头有题号
    const content = cleaned.substring(uniqueMatches[0].index).trim()
    // 尝试在内容中找更多题号（不带行首限制的）
    const innerMatches = findInnerQuestionNumbers(content)
    if (innerMatches.length >= 2) {
      for (let i = 0; i < innerMatches.length; i++) {
        const start = innerMatches[i].index
        const end = i < innerMatches.length - 1 ? innerMatches[i + 1].index : content.length
        const chunk = content.substring(start, end).trim()
        if (chunk.length > 15) {
          questions.push({
            number: innerMatches[i].number,
            type: detectQuestionType(chunk),
            content: chunk,
            confidence: 0.55,
          })
        }
      }
    } else {
      questions.push({
        number: uniqueMatches[0].number,
        type: detectQuestionType(content),
        content: content.substring(0, 3000),
        confidence: 0.5,
      })
    }
  }

  // 5. 兜底：如果没找到任何题号，按段落长度分段
  if (questions.length === 0) {
    const chunks = splitByLength(cleaned, 1000)
    chunks.forEach((chunk, idx) => {
      questions.push({
        number: String(idx + 1),
        type: detectQuestionType(chunk),
        content: chunk,
        confidence: 0.4,
      })
    })
  }

  return {
    subject: options.subject || 'other',
    subjectLabel: options.subject ? getSubjectLabel(options.subject) : '其他',
    grade: options.grade || '',
    questions,
    rawText: text,
    hasApiKey: false,
  }
}

/**
 * 在文本内部查找题号（不带行首限制，用于二次搜索）
 */
function findInnerQuestionNumbers(text: string): { index: number; number: string }[] {
  const regex = /(\d+)[\.、．]|\((\d+)\)|([①②③④⑤⑥⑦⑧⑨⑩])|第\s*(\d+)\s*[题问]/g
  const matches: { index: number; number: string }[] = []
  let m: RegExpExecArray | null

  while ((m = regex.exec(text)) !== null) {
    const number = m[1] || m[2] || m[3] || m[4] || ''
    if (number) {
      matches.push({ index: m.index, number })
    }
  }

  // 去重
  return matches.filter((item, i) => {
    if (i === 0) return true
    return item.index - matches[i - 1].index > 10
  })
}

/**
 * 按固定长度分割文本
 */
function splitByLength(text: string, maxLength: number): string[] {
  const chunks: string[] = []
  let current = ''
  // 按句子或段落分割
  const segments = text.split(/(?<=[。！？.!?])\s+|\n{2,}/)

  for (const seg of segments) {
    if (current.length + seg.length > maxLength && current.length > 100) {
      chunks.push(current.trim())
      current = seg
    } else {
      current += (current ? ' ' : '') + seg
    }
  }

  if (current.trim()) {
    chunks.push(current.trim())
  }

  return chunks.length > 0 ? chunks : [text.substring(0, maxLength)]
}

/**
 * 基于内容特征检测题型
 */
function detectQuestionType(content: string): QuestionBlock['type'] {
  const text = content.toLowerCase()

  // 选择题特征：A. B. C. D. 或 A、B、C、D、
  if (/[A-Da-d][\.．、]/.test(content) || /\([A-Da-d]\)/.test(content)) {
    return 'choice'
  }

  // 填空题特征
  if (text.includes('___') || text.includes('＿') || /\(\s*\)/.test(content)) {
    return 'fill'
  }

  // 证明题
  if (text.includes('证明') || text.includes('求证')) {
    return '证明'
  }

  // 计算题
  if (text.includes('计算') || text.includes('求') || /[=＝]/.test(content)) {
    return '计算'
  }

  return '其他'
}

/**
 * 构建 AI 提示词
 */
function buildPrompt(
  text: string,
  subject?: string,
  grade?: string,
  autoDetect?: boolean
): string {
  const subjectPart = subject 
    ? `科目：${getSubjectLabel(subject)}` 
    : '（如果需要，请自动识别科目）'
  
  const gradePart = grade 
    ? `年级：${grade}` 
    : '（如果需要，请自动识别年级）'
  
  return `你是一个专业的题目分析助手。请分析以下文本，提取题目信息。

${subjectPart}
${gradePart}

文本内容：
---
${text}
---

请以 JSON 格式返回分析结果：
{
  "subject": "识别的科目代码（math/english/chinese/physics/chemistry/biology/history/geography/politics/other）",
  "subjectLabel": "科目中文名称",
  "grade": "识别的年级",
  "questions": [
    {
      "number": "题号（如：1、2、3 或 第一问）",
      "type": "题型（choice/fill/解答/证明/计算/其他）",
      "content": "题目内容",
      "options": [{"label": "A", "content": "选项内容"}, ...],  // 选择题时填写
      "answer": "答案（如果有）",
      "explanation": "解析（如果有）",
      "confidence": 0.95
    }
  ],
  "rawText": "原始文本"
}

注意：
1. 如果文本中没有年级信息，grade 字段填空字符串 ""
2. 只返回有效的题目，跳过非题目内容
3. 返回纯 JSON，不要其他文字`
}

/**
 * 解析 AI 返回的结果
 */
function parseAIResponse(response: string, originalText: string): IdentifiedQuestions {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('无法解析 AI 返回结果')
    }
    
    const result = JSON.parse(jsonMatch[0])
    
    return {
      subject: result.subject || 'other',
      subjectLabel: result.subjectLabel || '其他',
      grade: result.grade || '',
      questions: result.questions || [],
      rawText: result.rawText || originalText,
      hasApiKey: true,
    }
  } catch (error) {
    console.error('JSON 解析失败:', error)
    return {
      subject: 'other',
      subjectLabel: '其他',
      grade: '',
      questions: [{
        number: null,
        type: '其他',
        content: originalText,
        confidence: 0.3,
      }],
      rawText: originalText,
      hasApiKey: true,
    }
  }
}

/**
 * 获取科目标签
 */
function getSubjectLabel(subject: string): string {
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
