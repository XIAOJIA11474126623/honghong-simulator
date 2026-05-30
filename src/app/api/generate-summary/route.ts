import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

interface QuestionResult {
  id: number;
  selectedScore: number;
  selectedLabel: string;
}

function tryParseJSON(content: string): Record<string, unknown> | null {
  // Strategy 1: Direct parse
  try {
    return JSON.parse(content.trim());
  } catch {
    // continue
  }

  // Strategy 2: Extract JSON from markdown code block
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // continue
    }
  }

  // Strategy 3: Find outermost braces
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // continue
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { role, scenario, totalScore, questionResults } = await request.json() as {
      role: string;
      scenario: string;
      totalScore: number;
      questionResults: QuestionResult[];
    };

    if (!role || !scenario || totalScore === undefined || !questionResults) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config({ timeout: 120000 });
    const client = new LLMClient(config, customHeaders);

    const partnerLabel = role === 'boyfriend' ? '女朋友' : '男朋友';

    const choicesSummary = questionResults
      .map((q) => `第${q.id}题：选了${q.selectedLabel}（${q.selectedScore}分）`)
      .join('\n');

    const systemPrompt = `你是恋爱关系分析专家。根据用户哄${partnerLabel}的答题表现，给出局后小结。

分析维度(0-100整数)：
1. emotionRecognition(情绪信号识别)
2. responseMethod(回应方式选择)
3. toneControl(语气把握)
4. timingJudgment(时机判断)

要求：态度温和有建设性，薄弱环节分析要具体，改善建议要具体可操作，禁止低俗/辱骂/PUA。

你必须只输出一个JSON对象，不要输出任何其他文字、说明或markdown标记。输出格式如下：
{"dimensions":{"emotionRecognition":85,"responseMethod":72,"toneControl":80,"timingJudgment":65},"weaknessAnalysis":"2-3句薄弱环节分析","improvementAdvice":"2-3句具体可操作的改善建议","overallComment":"1句温暖鼓励的总体评价"}`;

    const userPrompt = `场景：${scenario}\n角色：哄${partnerLabel}\n总分：${totalScore}/100\n\n答题记录：\n${choicesSummary}\n\n请给出局后小结，只输出JSON。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    // Retry logic
    let summaryData: Record<string, unknown> | null = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await client.invoke(messages, {
          model: 'doubao-seed-2-0-pro-260215',
          temperature: 0.7,
        });

        const parsed = tryParseJSON(response.content);
        if (parsed && parsed.dimensions) {
          summaryData = parsed;
          break;
        }
        console.warn(`[summary attempt ${attempt}] AI返回数据结构不完整，重试中...`);
      } catch (err) {
        console.warn(`[summary attempt ${attempt}] AI调用失败:`, err);
      }
    }

    if (!summaryData) {
      return NextResponse.json(
        { error: '生成小结失败，请稍后重试' },
        { status: 500 }
      );
    }

    // Validate dimensions
    const dims = summaryData.dimensions as Record<string, unknown>;
    const defaultDims = { emotionRecognition: 50, responseMethod: 50, toneControl: 50, timingJudgment: 50 };
    const validatedDims = {
      emotionRecognition: typeof dims?.emotionRecognition === 'number' ? dims.emotionRecognition : defaultDims.emotionRecognition,
      responseMethod: typeof dims?.responseMethod === 'number' ? dims.responseMethod : defaultDims.responseMethod,
      toneControl: typeof dims?.toneControl === 'number' ? dims.toneControl : defaultDims.toneControl,
      timingJudgment: typeof dims?.timingJudgment === 'number' ? dims.timingJudgment : defaultDims.timingJudgment,
    };

    return NextResponse.json({
      dimensions: validatedDims,
      weaknessAnalysis: (summaryData.weaknessAnalysis as string) || '继续练习，你会越来越好的！',
      improvementAdvice: (summaryData.improvementAdvice as string) || '多关注对方的情绪信号，试着先理解再回应。',
      overallComment: (summaryData.overallComment as string) || '加油，你已经迈出了学习情绪识别的第一步！',
    });
  } catch (error) {
    console.error('生成小结失败:', error);
    return NextResponse.json(
      { error: '生成小结失败，请稍后重试' },
      { status: 500 }
    );
  }
}
