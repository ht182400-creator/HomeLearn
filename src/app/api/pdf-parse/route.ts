/**
 * PDF 解析与题目识别 API
 */
import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromPDF, cleanText } from '@/lib/services/pdf-parser'
import { identifyQuestionsFromText } from '@/lib/services/question-identifier'

// 请求体验证
const validateRequest = (body: any) => {
  const errors: string[] = []
  
  if (!body.pdfBase64 && !body.pdfUrl) {
    errors.push('请提供 PDF 文件（pdfBase64 或 pdfUrl）')
  }
  
  if (body.pdfBase64 && typeof body.pdfBase64 !== 'string') {
    errors.push('pdfBase64 必须是字符串')
  }
  
  // 验证科目
  if (body.subject) {
    const validSubjects = ['math', 'english', 'chinese', 'physics', 'chemistry', 'biology', 'history', 'geography', 'politics', 'other']
    if (!validSubjects.includes(body.subject)) {
      errors.push(`科目必须是以下之一: ${validSubjects.join(', ')}`)
    }
  }
  
  // 验证年级
  if (body.grade) {
    const validGrades = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '成人']
    if (!validGrades.includes(body.grade)) {
      errors.push(`年级必须是以下之一: ${validGrades.join(', ')}`)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 验证请求
    const validation = validateRequest(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: '验证失败', details: validation.errors },
        { status: 400 }
      )
    }
    
    const { pdfBase64, subject, grade, autoDetect = true } = body
    
    // 1. 解析 PDF
    let buffer: Buffer
    if (pdfBase64) {
      // 从 Base64 解码
      const base64Data = pdfBase64.replace(/^data:.*?;base64,/, '')
      buffer = Buffer.from(base64Data, 'base64')
    } else {
      // 从 URL 下载（未来扩展）
      return NextResponse.json(
        { error: 'PDF URL 下载暂不支持，请使用 Base64 上传' },
        { status: 400 }
      )
    }
    
    // 2. 提取文本
    const parsed = await extractTextFromPDF(buffer)
    const cleanedText = cleanText(parsed.text)
    
    if (!cleanedText || cleanedText.length < 10) {
      return NextResponse.json(
        { error: 'PDF 中未提取到有效文本内容，请确保 PDF 包含可搜索文本' },
        { status: 400 }
      )
    }
    
    // 3. AI 题目识别
    const identified = await identifyQuestionsFromText(cleanedText, {
      subject,
      grade,
      autoDetect,
    })
    
    // 4. 返回结果
    return NextResponse.json({
      success: true,
      file: {
        totalPages: parsed.pageCount,
        fileSize: buffer.length,
      },
      analysis: {
        subject: identified.subject,
        subjectLabel: identified.subjectLabel,
        grade: identified.grade || grade || '',
        questionCount: identified.questions.length,
        confidence: identified.questions.length > 0 
          ? identified.questions.reduce((sum, q) => sum + q.confidence, 0) / identified.questions.length 
          : 0,
      },
      questions: identified.questions,
      rawText: identified.rawText,
      hasApiKey: identified.hasApiKey,
    })
    
  } catch (error: any) {
    console.error('PDF 解析 API 错误:', error)
    return NextResponse.json(
      { error: error.message || 'PDF 解析失败，请稍后重试' },
      { status: 500 }
    )
  }
}

// GET 请求返回 API 说明
export async function GET() {
  return NextResponse.json({
    name: 'PDF 解析与题目识别 API',
    version: '1.0',
    description: '解析 PDF 文件并使用 AI 识别题目结构',
    endpoints: {
      'POST /api/pdf-parse': {
        description: '解析 PDF 并识别题目',
        body: {
          pdfBase64: 'string (可选) - PDF 文件的 Base64 编码',
          pdfUrl: 'string (可选) - PDF 文件 URL（暂不支持）',
          subject: 'string (可选) - 科目代码',
          grade: 'string (可选) - 年级',
          autoDetect: 'boolean (可选, 默认 true) - 是否自动识别年级/科目',
        },
        responses: {
          success: '解析成功，返回识别结果',
          error: '解析失败',
        },
      },
    },
  })
}
