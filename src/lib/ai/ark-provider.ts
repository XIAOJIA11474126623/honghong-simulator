import { AIMessage, AIInvokeOptions, AIInvokeResult, AIProviderError, AIProvider } from './types';

const DEFAULT_TIMEOUT = 120000;

function classifyError(status: number, body: unknown): AIProviderError {
  if (status === 401) {
    return { code: 'AUTH_FAILED', message: 'API密钥无效或已过期', statusCode: status, retryable: false };
  }
  if (status === 403) {
    return { code: 'FORBIDDEN', message: '无权限访问该模型或接口', statusCode: status, retryable: false };
  }
  if (status === 429) {
    return { code: 'RATE_LIMITED', message: '请求过于频繁，请稍后重试', statusCode: status, retryable: true };
  }
  if (status >= 500) {
    return { code: 'SERVER_ERROR', message: 'ARK服务暂时不可用', statusCode: status, retryable: true };
  }

  const msg = body && typeof body === 'object' && 'message' in body
    ? String((body as Record<string, unknown>).message)
    : `未知错误 (HTTP ${status})`;
  return { code: 'UNKNOWN', message: msg, statusCode: status, retryable: false };
}

function extractTextFromOutput(output: unknown[]): string {
  if (!Array.isArray(output)) return '';

  const parts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;

    if (obj.type === 'message' && Array.isArray(obj.content)) {
      for (const c of obj.content) {
        if (c && typeof c === 'object' && (c as Record<string, unknown>).type === 'output_text') {
          const text = (c as Record<string, unknown>).text;
          if (typeof text === 'string') parts.push(text);
        }
      }
    }
  }

  return parts.join('\n');
}

export class ArkProvider implements AIProvider {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(apiKey: string, baseUrl: string, defaultModel: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
  }

  async invoke(messages: AIMessage[], options?: AIInvokeOptions): Promise<AIInvokeResult> {
    const model = options?.model || this.defaultModel;
    const timeout = options?.timeout || DEFAULT_TIMEOUT;
    const startTime = Date.now();

    console.log(`[AI] 开始调用 provider=ark model=${model} messages=${messages.length}`);

    const input = messages.map((msg) => ({
      role: msg.role,
      content: [
        { type: 'input_text' as const, text: msg.content },
      ],
    }));

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/responses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, input }),
        signal: AbortSignal.timeout(timeout),
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'TimeoutError') {
        console.error(`[AI] 调用超时 (${timeout}ms)`);
        throw { code: 'TIMEOUT', message: `请求超时 (${timeout / 1000}s)`, retryable: true } satisfies AIProviderError;
      }
      console.error(`[AI] 网络错误:`, err instanceof Error ? err.message : err);
      throw { code: 'NETWORK_ERROR', message: '网络连接失败，请检查网络', retryable: true } satisfies AIProviderError;
    }

    const elapsed = Date.now() - startTime;
    const status = response.status;

    if (!response.ok) {
      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text().catch(() => null);
      }
      const classified = classifyError(status, errorBody);
      console.error(`[AI] 调用失败 status=${status} code=${classified.code} elapsed=${elapsed}ms`);
      throw classified;
    }

    const data = await response.json() as Record<string, unknown>;
    const output = data.output as unknown[] | undefined;
    const usage = data.usage as Record<string, unknown> | undefined;

    const content = extractTextFromOutput(output || []);
    const usageInfo = usage
      ? {
          inputTokens: Number(usage.input_tokens) || 0,
          outputTokens: Number(usage.output_tokens) || 0,
          totalTokens: Number(usage.total_tokens) || 0,
          reasoningTokens: Number((usage.output_tokens_details as Record<string, unknown> | undefined)?.reasoning_tokens) || undefined,
        }
      : undefined;

    console.log(
      `[AI] 调用完成 status=${status} elapsed=${elapsed}ms tokens=${usageInfo?.totalTokens ?? 'N/A'}`
    );

    return { content, usage: usageInfo };
  }
}
