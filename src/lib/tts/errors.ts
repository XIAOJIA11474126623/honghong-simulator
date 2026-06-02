export type TTSErrorKind = 'auth' | 'permission' | 'rate_limit' | 'server' | 'timeout' | 'config' | 'unknown';

export class TTSError extends Error {
  kind: TTSErrorKind;
  statusCode: number;
  provider: string;

  constructor(message: string, options: { kind: TTSErrorKind; statusCode: number; provider: string }) {
    super(message);
    this.name = 'TTSError';
    this.kind = options.kind;
    this.statusCode = options.statusCode;
    this.provider = options.provider;
  }
}

export function toTTSError(error: unknown, provider: string): TTSError {
  if (error instanceof TTSError) return error;

  const message = error instanceof Error ? error.message : '语音合成失败';
  const lower = message.toLowerCase();

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return new TTSError('语音合成超时，请稍后重试', { kind: 'timeout', statusCode: 504, provider });
  }

  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('invalid api key')) {
    return new TTSError('TTS鉴权失败，请检查服务端语音凭证', { kind: 'auth', statusCode: 401, provider });
  }

  if (lower.includes('403') || lower.includes('permission') || lower.includes('denied') || lower.includes('access denied')) {
    return new TTSError('TTS权限不足，请检查音色或资源是否已开通', { kind: 'permission', statusCode: 403, provider });
  }

  if (lower.includes('429') || lower.includes('quota') || lower.includes('rate') || lower.includes('concurrency')) {
    return new TTSError('TTS调用频率过高，请稍后重试', { kind: 'rate_limit', statusCode: 429, provider });
  }

  if (lower.includes('500') || lower.includes('55000000') || lower.includes('server')) {
    return new TTSError('TTS服务异常，请稍后重试', { kind: 'server', statusCode: 502, provider });
  }

  return new TTSError(message || '语音合成失败', { kind: 'unknown', statusCode: 500, provider });
}
