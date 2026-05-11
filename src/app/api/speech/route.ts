/**
 * 语音评测 API
 */
import { NextRequest, NextResponse } from 'next/server'
import { evaluationRequestSchema } from '@/lib/validators/speech'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { audioBase64, referenceText, type } = body

    // 验证请求
    const validation = evaluationRequestSchema.validate({ audioBase64, referenceText, type })
    if (!validation.valid) {
      return NextResponse.json(
        { error: '验证失败', details: validation.errors },
        { status: 400 }
      )
    }

    // 模拟语音评测过程
    // 实际项目中应接入腾讯云 ASR、科大讯飞语音评测或其他语音评测服务
    const mockEvaluationProcess = async () => {
      // 模拟处理延迟
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // 模拟评测结果
      const results = [
        {
          transcript: 'The quick brown fox jumps over the lazy dog.',
          pronunciation: 92,
          fluency: 88,
          accuracy: 90,
          overall: 90,
          feedback: '发音非常标准！继续保持。注意 "lazy" 的发音，舌尖要轻触上颚。',
        },
        {
          transcript: 'The quick brown fox jumps over the lazy dog.',
          pronunciation: 85,
          fluency: 82,
          accuracy: 80,
          overall: 82,
          feedback: '整体不错！建议多练习连读技巧，比如 "jumps over" 可以连读。',
        },
        {
          transcript: 'The quick brown fox jumps over the lazy dog.',
          pronunciation: 78,
          fluency: 75,
          accuracy: 72,
          overall: 75,
          feedback: '基本发音准确，但语速可以稍快一些。注意 "brown" 中的双元音发音。',
        },
      ]

      return results[Math.floor(Math.random() * results.length)]
    }

    const evaluation = await mockEvaluationProcess()

    return NextResponse.json({
      id: `eval_${Date.now()}`,
      status: 'completed',
      audioUrl: null, // 实际项目中应保存音频文件并返回URL
      transcript: evaluation.transcript,
      pronunciation: evaluation.pronunciation,
      fluency: evaluation.fluency,
      accuracy: evaluation.accuracy,
      overall: evaluation.overall,
      feedback: evaluation.feedback,
      duration: Math.floor(Math.random() * 10) + 3, // 模拟时长 3-13 秒
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Speech evaluation error:', error)
    return NextResponse.json(
      { error: '评测失败，请稍后重试' },
      { status: 500 }
    )
  }
}

// 获取示例文本
export async function GET() {
  return NextResponse.json({
    sentences: [
      { text: 'The quick brown fox jumps over the lazy dog.', level: 'easy' },
      { text: 'Practice makes perfect.', level: 'easy' },
      { text: 'Knowledge is power.', level: 'easy' },
      { text: 'Reading makes a full man.', level: 'medium' },
      { text: 'The only limit is our doubts.', level: 'hard' },
    ],
    paragraphs: [
      { text: 'Education is the most powerful weapon...', level: 'medium' },
      { text: 'Climate change is one of the most pressing...', level: 'hard' },
    ],
    topics: [
      'Describe your favorite place.',
      'What would you do if you won the lottery?',
      'Explain the importance of learning English.',
    ],
  })
}
