/**
 * 批量生成举一反三题目
 * POST /api/ai/similar/batch
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { aiGateway } from "@/lib/ai/gateway";
import OpenAI from "openai";

/**
 * 生成变式题的提示词
 */
const SIMILAR_QUESTION_PROMPT = `你是一个专业的题目设计专家。请根据给定的原题目，生成 {count} 道举一反三的变式题。

要求：
1. 变式题应该与原题考察相同的知识点，但题目表述、条件数字或选项要有变化
2. 难度应该与原题相当或略有提升
3. 答案和解析要完整准确
4. 如果原题有多个小问，变式题应尽量保持相同的结构

请按以下JSON格式返回结果（只返回JSON，不要其他内容）：
{{
  "questions": [
    {{
      "content": "题目内容（富文本格式，支持HTML标签）",
      "answer": "答案",
      "analysis": "解题思路分析"
    }}
  ]
}}

原题目信息：
科目：{subject}
年级：{grade}
题目类型：{questionType}
题目内容：{content}
答案：{answer}
{analysisPlaceholder}`;

/**
 * 修复 JSON 字符串中未转义的换行符
 * 在 JSON 字符串值中（双引号内），真实的换行需要被替换为 \\n 字面量
 */
function fixJsonStringNewlines(jsonStr: string): string {
  return jsonStr.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, content) => {
    const fixed = content.replace(/\n/g, '\\n').replace(/\r/g, '');
    return `"${fixed}"`;
  });
}

/**
 * 备用解析：从非标准文本中提取 questions 数组
 * 使用正则尝试提取每道题目的关键信息
 */
function extractQuestionsFromText(text: string) {
  const questions: Array<{content: string; answer: string; analysis?: string}> = [];
  
  // 尝试匹配 content/answer 模式
  const qPattern = /(?:题目|content|题干)[：:]\s*([\s\S]*?)(?:答案|answer)[：:]\s*([\s\S]*?)(?=(?:解析|analysis|题目|content|题干)|$)/gi;
  
  let match;
  while ((match = qPattern.exec(text)) !== null) {
    if (match[1] && match[1].trim().length > 5 && match[2] && match[2].trim().length > 0) {
      questions.push({
        content: match[1].trim(),
        answer: match[2].trim(),
      });
    }
  }

  if (questions.length === 0) {
    console.warn("[Similar] 无法从AI返回文本中提取有效题目");
    return { questions: [] };
  }

  return { questions };
}

/**
 * 为单个题目生成变式题
 */
async function generateSimilarForQuestion(
  questionId: string,
  childId: string,
  parentId: string,
  triggerType: "MANUAL" | "AUTO" | "BATCH"
) {
  const question = await prisma.question.findFirst({
    where: { id: questionId },
    include: { subject: true },
  });

  if (!question) {
    return { questionId, error: "题目不存在" };
  }

  const child = await prisma.childAccount.findFirst({
    where: { id: childId },
  });

  if (!child) {
    return { questionId, error: "孩子不存在" };
  }

  // 获取当前使用的 AI 模型信息
  const adapters = aiGateway.getStatus();
  const currentAdapter = adapters.find(a => a.enabled);
  const modelUsed = currentAdapter?.name || "unknown";

  // 创建变式题记录
  const similarRecord = await prisma.similarQuestion.create({
    data: {
      originalQuestionId: questionId,
      childId,
      parentId,
      subjectId: question.subjectId,
      triggerType,
      status: "GENERATING",
      modelUsed,
      content: {}, // 初始空对象，AI生成后更新
    },
  });

  try {
    // 构建提示词
    const contentStr = typeof question.content === 'string' 
      ? question.content 
      : JSON.stringify(question.content);
    const answerStr = typeof question.answer === 'string' 
      ? question.answer 
      : JSON.stringify(question.answer);
    const analysisStr = question.analysis 
      ? (typeof question.analysis === 'string' 
        ? question.analysis 
        : JSON.stringify(question.analysis))
      : "";

    const prompt = SIMILAR_QUESTION_PROMPT
      .replace("{count}", "3")
      .replace("{subject}", question.subject.name)
      .replace("{grade}", child.grade || "未知")
      .replace("{questionType}", question.type)
      .replace("{content}", contentStr)
      .replace("{answer}", answerStr)
      .replace("{analysisPlaceholder}", analysisStr ? "解析：" + analysisStr : "");

    // 调用 AI 生成变式题
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "user", content: prompt },
    ];

    const result = await aiGateway.chat(messages);
    let aiContent = result.content;

    /**
     * 健壮的 JSON 提取和解析
     * 处理 AI 返回的各种格式：
     * 1. 标准 JSON
     * 2. Markdown 代码块包裹的 JSON (```json ... ```)
     * 3. 包含换行符、特殊字符的 JSON（需要清洗）
     */
    let parsedContent;
    try {
      // Step 1: 尝试提取 markdown 代码块中的内容
      const codeBlockMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        aiContent = codeBlockMatch[1].trim();
      }

      // Step 2: 查找最外层 { ... } 对象
      if (!aiContent.trim().startsWith('{')) {
        const objMatch = aiContent.match(/(\{[\s\S]*?\})(?:\s*$|\s*[,\]])/);
        if (objMatch) {
          aiContent = objMatch[1];
        }
      }

      // Step 3: 清洗常见问题字符
      // - 替换单引号为双引号（如果整体看起来像单引号 JSON）
      // - 修复未转义的换行符（在字符串值内）
      // - 移除可能的 BOM 和控制字符
      aiContent = aiContent
        .replace(/^\uFEFF/, '')  // 移除 BOM
        .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '')  // 移除控制字符
        .trim();

      // Step 4: 尝试修复常见的 JSON 格式问题
      // 修复字符串内未转义的换行符（用 \n 字面替换）
      aiContent = fixJsonStringNewlines(aiContent);

      parsedContent = JSON.parse(aiContent);

    } catch (parseError) {
      console.error("JSON解析失败:", parseError, "\n原始AI返回长度:", aiContent.length, "\n前500字:", aiContent.slice(0, 500));
      
      // 最后尝试：使用更宽松的方式提取 questions 数组
      try {
        parsedContent = extractQuestionsFromText(aiContent);
      } catch (fallbackError) {
        console.error("备用解析也失败:", fallbackError);
        parsedContent = { questions: [] };
      }
    }

    // 更新记录状态
    await prisma.similarQuestion.update({
      where: { id: similarRecord.id },
      data: {
        content: parsedContent,
        status: "COMPLETED",
        promptUsed: prompt,
      },
    });

    return { questionId, success: true, id: similarRecord.id };

  } catch (aiError) {
    console.error("AI生成失败:", aiError);
    
    await prisma.similarQuestion.update({
      where: { id: similarRecord.id },
      data: {
        status: "FAILED",
      },
    });

    return { questionId, error: "AI生成失败" };
  }
}

/**
 * 批量生成
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const { questionIds, childId, triggerType = "BATCH" } = body;

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json(
        { error: "缺少参数: questionIds (数组)" },
        { status: 400 }
      );
    }

    if (!childId) {
      return NextResponse.json(
        { error: "缺少参数: childId" },
        { status: 400 }
      );
    }

    // 验证孩子归属
    const child = await prisma.childAccount.findFirst({
      where: {
        id: childId,
        userId: session.user.id,
      },
    });

    if (!child) {
      return NextResponse.json({ error: "孩子不存在或无权访问" }, { status: 403 });
    }

    // 并发生成（限制并发数）
    const BATCH_SIZE = 3; // 每批最多3个
    const results = [];

    for (let i = 0; i < questionIds.length; i += BATCH_SIZE) {
      const batch = questionIds.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(qId => generateSimilarForQuestion(
          qId, 
          childId, 
          session.user.id, 
          triggerType
        ))
      );
      results.push(...batchResults);

      // 批次间隔（避免API限流）
      if (i + BATCH_SIZE < questionIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => r.error).length;

    // 生成成功后，自动创建推送任务（PracticeTask），同步到推送记录
    if (successCount > 0) {
      try {
        // 获取成功的变式题记录
        const successResults = results.filter((r): r is { questionId: string; success: true; id: string } => r.success);
        
        // 获取原题目信息（用于确定学科）
        const originalQuestions = await prisma.question.findMany({
          where: { id: { in: questionIds } },
          select: { id: true, subjectId: true },
        });
        const questionSubjectMap = new Map(originalQuestions.map(q => [q.id, q.subjectId]));
        
        // 取第一个题目的学科作为任务学科（或取最常见的）
        const subjectIds = [...new Set(successResults.map(r => questionSubjectMap.get(r.questionId)).filter(Boolean))];
        const primarySubjectId = subjectIds[0] || null;

        // 计算截止日期（默认今天 + 7 天）
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        // 创建推送任务
        const practiceTask = await prisma.practiceTask.create({
          data: {
            parentId: session.user.id,
            childId,
            subjectId: primarySubjectId,
            title: `举一反三练习 - ${successCount} 道变式题`,
            description: `基于错题自动生成的举一反三变式题，共 ${successCount} 道题目。`,
            questionIds, // 原始题目 ID 列表
            questionCount: questionIds.length,
            dueDate,
            status: "PENDING",
          },
        });

        console.log(`[BatchSimilar] 已创建推送任务: ${practiceTask.id}, 关联 ${successCount} 道变式题`);
      } catch (taskError) {
        console.error("[BatchSimilar] 创建推送任务失败:", taskError);
        // 不影响主流程，只记录错误
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: questionIds.length,
        success: successCount,
        failed: failCount,
        results,
      },
    });

  } catch (error) {
    console.error("批量生成举一反三API错误:", error);
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    );
  }
}
