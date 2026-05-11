/**
 * 智能组卷 API
 * 基于 AI 智能生成练习试卷
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateExamConfig, examTemplates, generateExamId, calculateTotalScore, difficultyScoreMap } from '@/lib/exam-generator/config';
import type { ExamConfig, GeneratedExam, ExamQuestion } from '@/lib/exam-generator/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证配置
    const config = validateExamConfig(body.config);
    
    // 模拟从题库中选题
    const questions = await selectQuestions(config);
    
    // 生成试卷
    const exam: GeneratedExam = {
      id: generateExamId(),
      title: body.title || `智能组卷 - ${new Date().toLocaleDateString()}`,
      config,
      questions,
      totalScore: calculateTotalScore(questions),
      timeLimit: config.timeLimit,
      createdAt: new Date().toISOString(),
    };
    
    return NextResponse.json({
      success: true,
      data: exam,
    });
  } catch (error) {
    console.error('生成试卷失败:', error);
    
    if (error instanceof Error && error.message.includes('ZodError')) {
      return NextResponse.json(
        { success: false, error: '无效的组卷配置' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: '生成试卷失败' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // 返回预设模板
  return NextResponse.json({
    success: true,
    data: examTemplates,
  });
}

// 根据配置选择题目
async function selectQuestions(config: ExamConfig): Promise<ExamQuestion[]> {
  const questions: ExamQuestion[] = [];
  const questionsPerType = Math.ceil(config.questionCount / config.questionTypes.length);
  
  for (const type of config.questionTypes) {
    if (type === 'all') continue;
    
    const typeQuestions = await getQuestionsByType(type, questionsPerType, config);
    questions.push(...typeQuestions);
  }
  
  // 随机打乱顺序
  return questions.sort(() => Math.random() - 0.5).slice(0, config.questionCount);
}

// 根据题型获取题目
async function getQuestionsByType(
  type: 'choice' | 'fill' | 'solve',
  count: number,
  config: ExamConfig
): Promise<ExamQuestion[]> {
  // 模拟从题库获取题目
  // 实际应用中应该连接数据库
  
  const mockQuestions: ExamQuestion[] = [];
  
  for (let i = 0; i < count; i++) {
    const difficulty = config.difficulty === 'mixed' 
      ? (['easy', 'medium', 'hard'] as const)[Math.floor(Math.random() * 3)]
      : config.difficulty;
    
    mockQuestions.push({
      id: `${type}_${Date.now()}_${i}`,
      subject: config.subjects[0] || '数学',
      type,
      content: getQuestionContent(type, difficulty),
      options: type === 'choice' ? getChoiceOptions() : undefined,
      answer: getMockAnswer(type),
      difficulty,
      score: difficultyScoreMap[difficulty],
    });
  }
  
  return mockQuestions;
}

// 获取题目内容
function getQuestionContent(type: 'choice' | 'fill' | 'solve', difficulty: string): string {
  if (type === 'choice') {
    return `下列关于${difficulty === 'easy' ? '数' : difficulty === 'medium' ? '函数' : '几何'}的说法中，正确的是？`;
  } else if (type === 'fill') {
    return `计算：${difficulty === 'easy' ? '2 + 3 = ___' : difficulty === 'medium' ? 'x² - 4 = 0, x = ___' : '∫₀¹ x² dx = ___'}`;
  } else {
    return `证明：${difficulty === 'easy' ? '勾股定理' : difficulty === 'medium' ? '三角形内角和定理' : '费马小定理'}`;
  }
}

// 获取选择题选项
function getChoiceOptions(): string[] {
  return [
    'A. 选项一',
    'B. 选项二',
    'C. 选项三',
    'D. 选项四',
  ];
}

// 获取模拟答案
function getMockAnswer(type: 'choice' | 'fill' | 'solve'): string {
  if (type === 'choice') return 'A';
  if (type === 'fill') return '5';
  return '证明过程略';
}
