import { NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import type { NextRequest } from 'next/server';

const SYSTEM_PROMPT = `你是一个恋爱场景出题专家。用户给你一个吵架场景，你生成指定数量的选择题。

每道题格式：
{"id":数字,"situation":"场景描述","question":"你该怎么做？","options":[{"label":"A","text":"选项","score":分数},{"label":"B","text":"选项","score":分数},{"label":"C","text":"选项","score":分数},{"label":"D","text":"选项","score":分数},{"label":"E","text":"选项","score":分数},{"label":"F","text":"选项","score":分数}],"aiReaction":{"high":"高分时对方会说的话，像真实聊天，温柔撒娇","medium":"中分时对方会说的话，半信半疑","low":"低分时对方会说的话，冷淡失望生气"}}

关键规则：
1. situation只描述客观发生了什么事件/对方做了什么动作，绝不描述对方情绪状态（如"她很生气""她脸色更差了"是禁止的）。用动作和语言暗示情绪，如"她把手机扣在桌上""他叹了口气没接话"
2. 6个选项分数：10/8/6/4/2/0，打乱顺序分配到A-F
3. 6分和4分选项要有迷惑性，看似合理实则踩雷或效果一般
4. 2分和0分也要像正常人下意识反应
5. situation从前一题自然延续，不跳跃场景，绝对不能换地点
6. aiReaction必须是对方（女朋友/男朋友）会说的话，不是评价描述。例如"哼，算你还有点良心~"而不是"立刻共情并给出承诺"
7. 高分aiReaction要软萌撒娇（如"哼...那你说怎么补偿我~"），中分半信半疑（如"你每次都这样说..."），低分冷淡失望（如"算了，你出去吧"）
8. 选项text不超20字，aiReaction不超25字
9. 只输出JSON，格式：{"questions":[...]}
10. 绝对不能换场景，所有题目都在同一个房间、同一件事情里发展
11. situation里用具体动作和语言推动剧情，不要重复相同的场景描述`;

const FALLBACK_OPTIONS = [
  { label: 'A', text: '轻轻拉住对方的手，认真道歉', score: 10 },
  { label: 'B', text: '温柔地抱住对方，说对不起', score: 8 },
  { label: 'C', text: '解释自己为什么这么做', score: 6 },
  { label: 'D', text: '说我知道错了，你别生气了', score: 4 },
  { label: 'E', text: '好好好我错了行了吧', score: 2 },
  { label: 'F', text: '你能不能别闹了', score: 0 },
];

async function generateQuestionsWithAI(
  client: LLMClient,
  systemPrompt: string,
  userPrompt: string,
  maxRetries = 2,
): Promise<{ id: number; situation: string; question: string; options: typeof FALLBACK_OPTIONS; aiReaction: { high: string; medium: string; low: string } }[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await client.invoke(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { model: 'doubao-seed-2-0-lite-260215' },
      );

      const content = res.content;
      if (!content) continue;

      const questions = extractQuestions(content);
      if (questions.length > 0) return questions;
    } catch (e) {
      console.error(`[generate-questions] attempt ${attempt} failed:`, e instanceof Error ? e.message : e);
    }
  }
  return [];
}

function extractQuestions(text: string): { id: number; situation: string; question: string; options: { label: string; text: string; score: number }[]; aiReaction: { high: string; medium: string; low: string } }[] {
  // Strategy 1: Direct parse
  try {
    const parsed = JSON.parse(text);
    const qs = parsed.questions || parsed.data?.questions || parsed;
    if (Array.isArray(qs) && qs.length > 0 && qs[0].question) return validateQuestions(qs);
  } catch { /* continue */ }

  // Strategy 2: Extract from markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      const qs = parsed.questions || parsed.data?.questions || parsed;
      if (Array.isArray(qs) && qs.length > 0 && qs[0].question) return validateQuestions(qs);
    } catch { /* continue */ }
  }

  // Strategy 3: Find JSON object with questions
  const jsonMatch = text.match(/\{[\s\S]*"questions"\s*:\s*\[[\s\S]*\][\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.questions && Array.isArray(parsed.questions)) return validateQuestions(parsed.questions);
    } catch { /* continue */ }
  }

  // Strategy 4: Find array directly
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      const parsed = JSON.parse(arrMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].question) return validateQuestions(parsed);
    } catch { /* continue */ }
  }

  return [];
}

function validateQuestions(questions: unknown[]): { id: number; situation: string; question: string; options: { label: string; text: string; score: number }[]; aiReaction: { high: string; medium: string; low: string } }[] {
  const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
  return questions
    .filter((q): q is Record<string, unknown> => typeof q === 'object' && q !== null && typeof (q as Record<string, unknown>).question === 'string')
    .map((q, idx) => {
      const rawOptions = Array.isArray(q.options) ? q.options : [];
      const validOptions = rawOptions
        .filter((o: unknown) => typeof o === 'object' && o !== null && typeof (o as Record<string, unknown>).text === 'string' && ((o as Record<string, unknown>).text as string).trim() !== '')
        .map((o: Record<string, unknown>, j: number) => ({
          label: labels[j] || String.fromCharCode(65 + j),
          text: String(o.text),
          score: typeof o.score === 'number' && !isNaN(o.score) ? o.score : 0,
        }));


      // Fill missing options
      while (validOptions.length < 6) {
        const fi = validOptions.length;
        validOptions.push({ ...FALLBACK_OPTIONS[fi] });
      }

      const aiReaction = (typeof q.aiReaction === 'object' && q.aiReaction !== null) ? q.aiReaction : {};
      return {
        id: typeof q.id === 'number' ? q.id : idx + 1,
        situation: typeof q.situation === 'string' ? q.situation : '',
        question: String(q.question),
        options: validOptions,
        aiReaction: {
          high: typeof (aiReaction as Record<string, unknown>).high === 'string' ? String((aiReaction as Record<string, unknown>).high) : '靠在你肩上，轻声说谢谢你来哄我',
          medium: typeof (aiReaction as Record<string, unknown>).medium === 'string' ? String((aiReaction as Record<string, unknown>).medium) : '看了你一眼，叹了口气',
          low: typeof (aiReaction as Record<string, unknown>).low === 'string' ? String((aiReaction as Record<string, unknown>).low) : '别碰我，我想静静',
        },
      };
    });
}

function generateFallbackQuestions(startIndex: number, count: number, scenario: string, role: string) {
  const questions: { id: number; situation: string; question: string; options: { label: string; text: string; score: number }[]; aiReaction: { high: string; medium: string; low: string } }[] = [];
  const fallbackSituations = [
    `${role === 'boyfriend' ? '她' : '他'}因为这件事明显不太高兴了`,
    `${role === 'boyfriend' ? '她' : '他'}开始沉默不说话了`,
    `${role === 'boyfriend' ? '她' : '他'}的眼神越来越冷了`,
    `${role === 'boyfriend' ? '她' : '他'}转身不想理你了`,
    `${role === 'boyfriend' ? '她' : '他'}开始收拾东西了`,
    `${role === 'boyfriend' ? '她' : '他'}红着眼眶看着你`,
    `${role === 'boyfriend' ? '她' : '他'}终于开口说了句气话`,
    `${role === 'boyfriend' ? '她' : '他'}的情绪开始缓和了`,
    `${role === 'boyfriend' ? '她' : '他'}愿意听你说话了`,
    `${role === 'boyfriend' ? '她' : '他'}的情绪终于平复了`,
  ];
  const labels = ['A', 'B', 'C', 'D', 'E', 'F'];

  for (let i = 0; i < count; i++) {
    const situationIdx = (startIndex + i) % fallbackSituations.length;
    const shuffled = [...FALLBACK_OPTIONS].sort(() => Math.random() - 0.5);
    const relabeled = shuffled.map((opt, j) => ({ ...opt, label: labels[j] }));
    questions.push({
      id: startIndex + i + 1,
      situation: `${scenario}——${fallbackSituations[situationIdx]}`,
      question: '你该怎么做？',
      options: relabeled,
      aiReaction: {
        high: '靠过来轻轻抱住你，说你还是在乎我的',
        medium: '看了你一眼，虽然没说话但好像没那么生气了',
        low: '推开你的手，说我想一个人待着',
      },
    });
  }
  return questions;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const role = body.role as string;
    const scenario = body.scenario as string;
    const batch = body.batch as string || 'all';

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    let startIndex = 0;
    let numQuestions = 10;
    let userPrompt = '';

    if (batch === 'first') {
      startIndex = 0;
      numQuestions = 2;
      userPrompt = `角色：我是${role === 'boyfriend' ? '男朋友' : '女朋友'}，对方是${role === 'boyfriend' ? '女朋友' : '男朋友'}
场景：${scenario}
请生成前2道题（场景刚开始，对方刚有反应），id从1开始。只输出JSON。`;
    } else if (batch === 'second') {
      startIndex = 2;
      numQuestions = 3;
      userPrompt = `角色：我是${role === 'boyfriend' ? '男朋友' : '女朋友'}，对方是${role === 'boyfriend' ? '女朋友' : '男朋友'}
场景：${scenario}
请生成第3-5道题（场景继续发展，出现新的情况），id从3开始。只输出JSON。`;
    } else if (batch === 'third') {
      startIndex = 5;
      numQuestions = 3;
      userPrompt = `角色：我是${role === 'boyfriend' ? '男朋友' : '女朋友'}，对方是${role === 'boyfriend' ? '女朋友' : '男朋友'}
场景：${scenario}
请生成第6-8道题（场景进入关键转折点，事情变得更复杂），id从6开始。只输出JSON。`;
    } else if (batch === 'fourth') {
      startIndex = 8;
      numQuestions = 2;
      userPrompt = `角色：我是${role === 'boyfriend' ? '男朋友' : '女朋友'}，对方是${role === 'boyfriend' ? '女朋友' : '男朋友'}
场景：${scenario}
请生成第9-10道题（场景接近尾声，到了收尾时刻），id从9开始。只输出JSON。`;
    } else {
      userPrompt = `角色：我是${role === 'boyfriend' ? '男朋友' : '女朋友'}，对方是${role === 'boyfriend' ? '女朋友' : '男朋友'}
场景：${scenario}
请生成完整的10道题，场景事件逐步推进。只输出JSON。`;
    }

    let questions = await generateQuestionsWithAI(client, SYSTEM_PROMPT, userPrompt);

    // Fix IDs
    questions = questions.map((q, i) => ({ ...q, id: startIndex + i + 1 }));

    // If AI generated more questions than needed, trim
    if (questions.length > numQuestions) {
      questions = questions.slice(0, numQuestions);
    }

    // If AI generated fewer than needed, fill with fallback
    if (questions.length < numQuestions) {
      const fallback = generateFallbackQuestions(startIndex + questions.length, numQuestions - questions.length, scenario, role);
      questions = [...questions, ...fallback];
    }

    // Shuffle options for each question
    for (const q of questions) {
      const shuffled = [...q.options].sort(() => Math.random() - 0.5);
      q.options = shuffled.map((opt, i) => ({ ...opt, label: ['A', 'B', 'C', 'D', 'E', 'F'][i] }));
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('[generate-questions] fatal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI生成失败' },
      { status: 500 },
    );
  }
}
