import { ArkProvider } from './ark-provider';
import { AIProvider } from './types';

let _provider: AIProvider | null = null;

export function createAIProvider(): AIProvider {
  if (_provider) return _provider;

  const apiKey = process.env.ARK_API_KEY;
  const baseUrl = process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
  const model = process.env.ARK_MODEL || 'doubao-seed-2-0-pro-260215';

  if (!apiKey) {
    throw new Error('ARK_API_KEY 环境变量未设置，请在 .env.local 中配置');
  }

  _provider = new ArkProvider(apiKey, baseUrl, model);
  return _provider;
}
