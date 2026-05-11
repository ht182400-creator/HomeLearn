/**
 * OCR 图片识别 API
 */
import { NextRequest, NextResponse } from 'next/server'
import { ocrRequestSchema } from '@/lib/validators/ocr'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageBase64, subject, questionType } = body

    // 验证请求
    const validation = ocrRequestSchema.validate({ imageBase64, subject, questionType })
    if (!validation.valid) {
      return NextResponse.json(
        { error: '验证失败', details: validation.errors },
        { status: 400 }
      )
    }

    // 模拟 OCR 识别过程
    // 实际项目中应接入百度 OCR、腾讯 OCR 或其他 OCR 服务
    const mockOcrProcess = async () => {
      // 模拟处理延迟
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // 模拟提取的文本
      const mockResults = [
        {
          originalText: '已知函数 f(x) = x² + 2x + 1，求 f(3) 的值。',
          extractedText: '已知函数 f(x) = x² + 2x + 1，求 f(3) 的值。\n\n解：\nf(3) = 3² + 2×3 + 1 = 9 + 6 + 1 = 16',
          subject: 'math',
          questionType: '计算',
          confidence: 0.95,
        },
        {
          originalText: 'Complete the sentence: She ___ to the market yesterday.',
          extractedText: 'Complete the sentence: She ___ to the market yesterday.\n\n答案: went\n\n语法解释:  yesterday 是一般过去时的标志，go 的过去式是不规则变化 went',
          subject: 'english',
          questionType: '填空',
          confidence: 0.92,
        },
        {
          originalText: '请简要分析《静夜思》的思想感情。',
          extractedText: '《静夜思》思想感情分析：\n\n1. 思乡之情：诗人通过"举头望明月，低头思故乡"表达了对故乡的深切思念\n2. 孤独感：身处异乡，面对明月，触景生情\n3. 诗人借明月寄托对亲人的思念',
          subject: 'chinese',
          questionType: '解答',
          confidence: 0.88,
        },
      ]

      return mockResults[Math.floor(Math.random() * mockResults.length)]
    }

    const ocrResult = await mockOcrProcess()

    return NextResponse.json({
      id: `ocr_${Date.now()}`,
      status: 'completed',
      originalText: ocrResult.originalText,
      extractedText: ocrResult.extractedText,
      subject: subject || ocrResult.subject,
      questionType: questionType || ocrResult.questionType,
      confidence: ocrResult.confidence,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('OCR API error:', error)
    return NextResponse.json(
      { error: '识别失败，请稍后重试' },
      { status: 500 }
    )
  }
}
