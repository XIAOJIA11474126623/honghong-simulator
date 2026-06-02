import { CozeTTSProvider } from './coze-provider';
import type { TTSProvider } from './types';
import { VolcengineTTSProvider } from './volcengine-provider';

export function createTTSProvider(headers: Headers): TTSProvider {
  const provider = (process.env.AI_TTS_PROVIDER || 'volcengine').toLowerCase();

  if (provider === 'coze') {
    return new CozeTTSProvider(headers);
  }

  if (provider === 'volcengine') {
    return new VolcengineTTSProvider();
  }

  throw new Error(`不支持的TTS provider: ${provider}`);
}
